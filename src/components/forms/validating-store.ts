import { create, test, enforce, only } from "vest";
import type { Suite, SuiteResult } from "vest";
import { readable, writable, get, derived } from "svelte/store";
import type { Readable, Writable, Subscriber, Unsubscriber, Updater } from "svelte/store";
import { JsonPointer } from "json-ptr";

type StoreState<T> = { [P in keyof T]-?: ValidatingStoreItem<T[P]> }

export class ValidatingStoreItem<TProp = any> {
	private valueStore: Writable<any>;
	private dirtyStore: Writable<any>;
	private validationAccessor: () => SuiteResult<string, string>;
	private _value: TProp;
	private _isDirty: boolean = false;

	readonly pointer: JsonPointer;
	readonly path: string;

	get name(): string {
		return this.path.substring(this.path.lastIndexOf("/"));
	}

	get value(): TProp {
		return this._value;
	}
	set value(value: TProp) {
		this.valueStore.update(state => {
			this.pointer.set(state, value);
			return state;
		});
	}

	get isDirty(): boolean {
		return this._isDirty;
	}
	set isDirty(value: boolean) {
		this.dirtyStore.update(state => {
			this.pointer.set(state, value, true);
			return state;
		});
	}

	get isValid(): boolean {
		return this.validationAccessor().isValid(this.path);
	}

	get errors(): string[] {
		if (!this.isDirty) {
			return [];
		}
		return this.validationAccessor().getErrors(this.path);
	}

	get hasErrors(): boolean {
		return this.isDirty
			&& this.validationAccessor().hasErrors(this.path);
	}

	constructor(pointer: JsonPointer, valueStore: Writable<any>, dirtyStore: Writable<any>, validationAccessor: () => SuiteResult<string, string>) {
		this.pointer = pointer;
		this.path = pointer.path.join(".");
		this.valueStore = valueStore;
		this.dirtyStore = dirtyStore;
		this.validationAccessor = validationAccessor;

		this.valueStore.subscribe(state => {
			this._value = this.pointer.get(state) as TProp;
		});
		this.dirtyStore.subscribe(state => {
			this._isDirty = this.pointer.get(state) as boolean;
		});
	}

	touch() {
		if (this.value != null && this.value != "") {
			this.isDirty = true;
		}
	}
}

export class ValidatingStore<TState> implements Writable<StoreState<TState>> {
	private initialData: TState;
	private vmStore: Writable<StoreState<TState>>;
	private valueStore: Writable<TState>;
	private dirtyStore: Writable<{}>;
	private aggregateStore: Readable<StoreState<TState>>;

	readonly suite: Suite<keyof TState & string, string, (data: TState) => void>;
	result: SuiteResult<keyof TState & string, string>;

	constructor(initialData: TState, suiteCallback: (data: TState) => void) {
		this.initialData = initialData;

		this.valueStore = writable(initialData);
		this.dirtyStore = writable(this.createEmptyDirtyState(initialData));
		this.vmStore = writable(this.createStoreState(initialData));
		this.aggregateStore = derived([this.valueStore, this.dirtyStore, this.vmStore], $values => $values[2]);

		this.suite = create(suiteCallback);
		this.result = this.suite.get();
	}

	subscribe(run: Subscriber<StoreState<TState>>): Unsubscriber {
		return this.aggregateStore.subscribe(run);
	}

	set(value: StoreState<TState>): void {
		this.vmStore.set(value);
		this.result = this.suite(this.getData());
	}

	update(updater: Updater<StoreState<TState>>): void {
		this.vmStore.update(updater);
		this.result = this.suite(this.getData());
	}

	validate(): boolean {
		this.update(state => {
			this.traverseVmState(state, item => {
				item.isDirty = true;
			});
			return state;
		});

		let data = this.getData();
		this.result = this.suite(data);
		return this.result.isValid();
	}

	clear() {
		this.valueStore.set(this.initialData);
		this.dirtyStore.set(this.createEmptyDirtyState(this.initialData));
		this.vmStore.set(this.createStoreState(this.initialData));
		this.suite.reset();
	}

	getData(): TState {
		return get(this.valueStore);
	}

	updateData(updater: Updater<TState>): void {
		let data = get(this.valueStore);
		updater(data);
		let transformed = this.createStoreState(data);
		this.set(transformed);
	}

	private traverseVmState(data: any, action: (item: ValidatingStoreItem) => void) {
		if (data == null) {
			return;
		}

		if (data instanceof ValidatingStoreItem) {
			action(data);

		}
		else if (Array.isArray(data)) {
			for (let item of data) {
				this.traverseVmState(item, action);
			}

		} else if (typeof data === "object" && Object.keys(data).length > 0) {
			for (let propValue of Object.values(data)) {
				this.traverseVmState(propValue, action);
			}
		}
	}

	private createEmptyDirtyState(data: any): any {
		let items: any = {};
		for (let [propName, value] of Object.entries(data)) {
			items[propName] = createRecursive(value);
		}
		return items;

		function createRecursive(value: any): any {
			if (Array.isArray(value)) {
				return value.map((x, i) => createRecursive(x));

			} else if (value != null && typeof value === "object" && Object.keys(value).length > 0) {
				let output: any = {};
				for (let [subProp, subPropValue] of Object.entries(value)) {
					output[subProp] = createRecursive(subPropValue);
				}
				return output;

			} else {
				return false;
			}
		}
	}

	private createStoreState(data: any): StoreState<TState> {
		let items: any = {};
		for (let [propName, value] of Object.entries(data)) {
			items[propName] = createRecursive(`/${propName}`, value, this.valueStore, this.dirtyStore, () => this.result);
		}
		return items;

		function createRecursive(pointer: string, value: any, dataStore: any, dirtyStore: any, validationAccessor: () => SuiteResult<string, string>): any {
			if (Array.isArray(value) && (value[0] != null && typeof value[0] === "object" && Object.keys(value[0]).length > 0)) {
				return value.map((x, i) => createRecursive(`${pointer}/${i}`, x, dataStore, dirtyStore, validationAccessor));

			} else if (value != null && typeof value === "object" && Object.keys(value).length > 0) {
				let output: any = {};
				for (let [subProp, subPropValue] of Object.entries(value)) {
					output[subProp] = createRecursive(`${pointer}/${subProp}`, subPropValue, dataStore, dirtyStore, validationAccessor);
				}
				return output;

			} else {
				var jsonPointer = new JsonPointer(pointer);
				return new ValidatingStoreItem(jsonPointer, dataStore, dirtyStore, validationAccessor);
			}
		}
	}
}
