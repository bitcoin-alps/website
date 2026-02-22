import { create, test, enforce, only } from "vest";
import type { Suite, SuiteResult } from "vest";
import type { CB } from "vest-utils";
import { readable, writable, get, derived } from "svelte/store";
import type { Readable, Writable, Subscriber, Unsubscriber, Updater } from "svelte/store";
import { JsonPointer } from "json-ptr";
import { walk, reduce, deepCopy } from "walkjs";
import type { ProblemDocument } from "http-problem-details";

type Unarray<T> = T extends Array<infer U> ? U : T;
type StoreState<T> = { [P in keyof T]-?: T[P] extends Array<any> ? ValidatingStoreItem<ValidatingStoreItem<StoreState<Unarray<T[P]>>>[]> : ValidatingStoreItem<T[P]> }
type OmitFirst<T extends unknown[]> = T extends [unknown, ...infer R] ? R : never

export interface ValidationProblemDetails extends ProblemDocument {
	errors: Record<string, string[]>;
}

export abstract class ValidatingStoreItem<T> {
	protected valueStore: Writable<any>;
	protected _isDirty: boolean = false;
	protected _isValid: boolean = false;
	protected _hasErrors: boolean = false;
	protected _errors: string[] = [];
	protected _externalErrors: string[] = [];

	readonly pointer: JsonPointer;
	readonly path: string;

	abstract get value(): T;
	abstract set value(value: T);

	isDirty: boolean;

	get isValid(): boolean {
		return this._isValid;
	}

	get errors(): string[] {
		if (!this.isDirty) {
			return this._externalErrors;
		}
		return this._errors.concat(this._externalErrors);
	}

	get hasErrors(): boolean {
		return (this.isDirty && this._hasErrors) || this._externalErrors.length > 0;
	}

	constructor(pointer: JsonPointer, validationStore: Readable<SuiteResult<string, string>>, externalErrorsStore: Readable<Record<string,string[]>>) {
		this.pointer = pointer;
		this.path = pointer.path.join(".");

		validationStore.subscribe(state => {
			this._isValid = state.isValid(this.path);
			this._hasErrors = state.hasErrors(this.path);
			this._errors = state.getErrors(this.path);
			this._externalErrors = [];
		});
		externalErrorsStore.subscribe(state => {
			this._externalErrors = state[this.path] ?? [];
		});
	}

	touch() {
		if (this.value != null && this.value != "") {
			this.isDirty = true;
		}
	}
}

export class ValidatingStoreNested<T = any> extends ValidatingStoreItem<T> {
	value: T;

	constructor(pointer: JsonPointer, validationStore: Readable<SuiteResult<string, string>>, externalErrorsStore: Readable<Record<string,string[]>>, value: T) {
		super(pointer, validationStore, externalErrorsStore);
		this.value = value;
	}
}

export class ValidatingStoreValue<T = any> extends ValidatingStoreItem<T> {
	private _value: T;
	
	get value(): T {
		return this._value;
	}
	set value(value: T) {
		this.valueStore.update(state => {
			this.pointer.set(state, value);
			return state;
		});
	}

	constructor(pointer: JsonPointer, validationStore: Readable<SuiteResult<string, string>>, externalErrorsStore: Readable<Record<string,string[]>>, valueStore: Writable<any>) {
		super(pointer, validationStore, externalErrorsStore);
		this.valueStore = valueStore;

		this.valueStore.subscribe(state => {
			this._value = this.pointer.get(state) as T;
		});
	}
}

export class ValidatingStore<TState extends object, TValidationFunc extends CB> implements Writable<StoreState<TState>> {
	#initialData: TState;
	#vmStore: Writable<StoreState<TState>>;
	#externalErrorsStore: Writable<Record<string,string[]>>;
	#aggregateStore: Readable<StoreState<TState>>;
	
	readonly valueStore: Writable<TState>;
	readonly validationStore: Writable<SuiteResult<keyof TState & string, string>>;
	readonly suite: Suite<keyof TState & string, string, CB>;

	constructor(initialData: TState, suiteCallback: TValidationFunc) {
		this.#initialData = deepCopy(initialData) as TState;
		this.#externalErrorsStore = writable({});

		this.valueStore = writable(deepCopy(initialData) as TState);
		
		this.suite = create(suiteCallback) as any;
		this.validationStore = writable(this.suite.get());
		this.suite.subscribe(() => {
			this.validationStore.update(_ => this.suite.get());
		});
		this.validationStore.set(this.suite(initialData));

		this.#vmStore = writable(this.#createStoreState(initialData));

		this.#aggregateStore = derived([this.valueStore, this.#vmStore, this.#externalErrorsStore], values => values[1]);
	}

	subscribe(run: Subscriber<StoreState<TState>>): Unsubscriber {
		return this.#aggregateStore.subscribe(run);
	}

	validate(...args: OmitFirst<Parameters<TValidationFunc>>): boolean {
		this.update(state => {
			walk(state, {
				graphMode: "tree",
				onVisit: {
					callback: node => node.val.isDirty = true,
					filters: node => node.val instanceof ValidatingStoreItem
				}
			});
			return state;
		});

		this.validationStore.set(this.suite(this.getData(), ...args));
		return get(this.validationStore).isValid();
	}

	validateGroup(groupName: string, ...args: OmitFirst<Parameters<TValidationFunc>>): boolean {
		let validationResult = get(this.validationStore);
		let fieldNamesInGroup = Object.keys(validationResult.groups[groupName]);
		this.update(state => {
			walk(state, {
				graphMode: "tree",
				onVisit: {
					callback: node => {
						if (fieldNamesInGroup.includes(node.val.path)) {
							node.val.isDirty = true;
						}
					},
					filters: node => node.val instanceof ValidatingStoreItem
				}
			});
			return state;
		});

		this.validationStore.set(this.suite(this.getData(), ...args));
		return get(this.validationStore).isValidByGroup(groupName);
	}

	setInitialData(data: TState) {
		this.#initialData = deepCopy(data) as TState;
	}

	clear() {
		this.valueStore.set(deepCopy(this.#initialData) as TState);
		this.set(this.#createStoreState(this.#initialData));
		this.suite.reset();
		this.validationStore.set(this.suite(this.getData()));
	}

	getData(): TState {
		return get(this.valueStore);
	}

	updateData(updater: Updater<TState>): void {
		this.valueStore.update(state => {
			let newState = updater(state);
			return deepCopy(newState) as TState;
		});
		this.set(this.#createStoreState(get(this.valueStore)));
	}

	set(value: StoreState<TState>): void {
		this.#vmStore.set(value);
		this.validationStore.set(this.suite(this.getData()));
	}

	update(updater: Updater<StoreState<TState>>): void {
		this.#vmStore.update(updater);
		this.validationStore.set(this.suite(this.getData()));
	}

	setExternalErrors(problemDetails: ValidationProblemDetails) {
		let errors: Record<string, string[]> = {};
		for (let [field, externalErrors] of Object.entries(problemDetails.errors)) {
			let camelCasedField = field.split(".").map(x => x.substring(0,1).toLowerCase() + x.substring(1)).join(".");
			let path = camelCasedField.replace(/\[(\d+)\]\./, ".$1.");
			errors[path] = externalErrors;
		}
		this.#externalErrorsStore.set(errors);
	}
	clearExternalErrors() {
		this.#externalErrorsStore.set({});
	}

	#createStoreState(data: any): StoreState<TState> {
		let items: any = {};
		for (let [propName, value] of Object.entries(data)) {
			items[propName] = createRecursive(`/${propName}`, value, this.valueStore, this.validationStore, this.#externalErrorsStore);
		}
		return items;

		function createRecursive(pointer: string, value: any, dataStore: any, validationStore: Readable<SuiteResult<string, string>>, externalErrorsStore: Writable<Record<string, string[]>>): any {
			var jsonPointer = new JsonPointer(pointer);

			if (Array.isArray(value) && (value[0] != null && typeof value[0] === "object" && Object.keys(value[0]).length > 0)) {
				let items = value.map((x, i) => createRecursive(`${pointer}/${i}`, x, dataStore, validationStore, externalErrorsStore));
				return new ValidatingStoreNested(jsonPointer, validationStore, externalErrorsStore, items);

			} else if (value != null && typeof value === "object" && Object.keys(value).length > 0) {
				let nested: any = {};
				for (let [subProp, subPropValue] of Object.entries(value)) {
					nested[subProp] = createRecursive(`${pointer}/${subProp}`, subPropValue, dataStore, validationStore, externalErrorsStore);
				}
				return new ValidatingStoreNested(jsonPointer, validationStore, externalErrorsStore, nested);

			} else {
				return new ValidatingStoreValue(jsonPointer, validationStore, externalErrorsStore, dataStore);
			}
		}
	}
}
