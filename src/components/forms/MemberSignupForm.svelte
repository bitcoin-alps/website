<script lang="ts">
	import ky from "ky";
	import { test, enforce, only, omitWhen } from "vest";
	import { ProblemDocument } from "http-problem-details";
	import "vest/enforce/email";

    import CheckCircle from "/src/icons/check-circle.svg?raw";
    import WarningTriangle from "/src/icons/warning-triangle.svg?raw";

	import TextField from "./TextField.svelte";
	import { FormState } from "./models";
	import { ValidatingStore } from "./validating-store";

	interface MemberSignupRequest {
		firstname: string;
		lastname: string;
		email: string;
		street: string;
		postalCode: string;
		city: string;
		acceptTos: boolean;
	}

    const tosUrl: string = "/docs/Statuten_Bitcoin_Alps_V02.00.pdf";
    const action: string = "/api/member-signup";
	const initialData: MemberSignupRequest = {
		firstname: "",
		lastname: "",
		email: "",
		street: ""
,		postalCode: "",
		city: "",
		acceptTos: false,
	};
	const validationFunc = (data: MemberSignupRequest) => {
		test("firstname", "Bitte gib deinen vollen Namen an.", () => {
			enforce(data.firstname).isNotEmpty();
		});
		test("lastname", "Bitte gib deinen vollen Namen an.", () => {
			enforce(data.lastname).isNotEmpty();
		});
		test("email", "Bitte gib deine E-Mail-Adresse an.", () => {
			enforce(data.email).isNotEmpty().isEmail();
		});
		test("street", "Bitte gib deine Strasse an.", () => {
			enforce(data.street).isNotEmpty();
		});
		test("postalCode", "Bitte gib deine PLZ an.", () => {
			enforce(data.postalCode).isNotEmpty();
		});
		test("city", "Bitte gib deinen Wohnort an.", () => {
			enforce(data.city).isNotEmpty();
		});
		test("acceptTos", "Du musst den Statuten zustimmen um den Mitgliedschaftsantrag zu stellen.", () => {
			enforce(data.acceptTos).equals(true);
		});
	};

	let state: FormState = FormState.Initial;
	let store = new ValidatingStore<MemberSignupRequest>(initialData, validationFunc);
	let error: ProblemDocument | null = null;

	async function submit() {
		try {
			if (!store.validate()) {
				return;
			}

			let data = store.getData();

			state = FormState.Loading;
			let response = await ky.post(action, {
				json: data,
				throwHttpErrors: false,
			});
			if (!response.ok) {
				error = await response.json<ProblemDocument>();
				state = FormState.Error;
				return;
			}

			state = FormState.Success;
		} catch (e) {
			state = FormState.Error;
		}
	}
</script>

<div class="member-signup-form my-5">
	<h2 class="title is-3">Mitgliedschaft beantragen</h2>
	<p class="mb-2">Der Mitgliederbeitrag beträgt CHF 50.–/Jahr.</p>

	{#if state === FormState.Initial || state === FormState.Loading}
		<div class="columns is-multiline is-mobile mt-4">
			<div class="column is-12-touch is-6-desktop">
				<TextField label="Vorname" autocomplete="given-name" name="firstname" {store} />
			</div>
			<div class="column is-12-touch is-6-desktop">
				<TextField label="Nachname" autocomplete="family-name" name="lastname" {store} />
			</div>
			<div class="column is-12-touch is-6-desktop">
				<TextField label="E-Mail" type="email" autocomplete="email" name="email" {store} />
			</div>
			<div class="column is-12-touch is-6-desktop">
				<TextField label="Strasse" autocomplete="street" name="street" {store} />
			</div>
			<div class="column is-4">
				<TextField label="PLZ" autocomplete="postal-code" name="postalCode" {store} />
			</div>
			<div class="column is-8">
				<TextField label="Ort" autocomplete="address-level2" name="city" {store} />
			</div>
			<div class="column is-12">
				<div class="field">
					<input class="is-checkradio is-primary" id="acceptTos" name="acceptTos" type="checkbox" bind:checked={$store.acceptTos.value} />
					<label for="acceptTos">Ich habe <a class="has-underline" href={tosUrl} target="_blank">die Statuten</a> gelesen und möchte dem Verein Bitcoin Alps beitreten.</label>
				</div>
				{#each $store.acceptTos.errors as error}
					<p class="help is-danger">{error}</p>
				{/each}
			</div>

			<div class="column is-12 is-flex is-justify-content-center">
				<button class="button is-primary" class:is-loading={state === FormState.Loading} on:click={submit}>Antrag abschicken</button>
			</div>
		</div>
	{/if}

	{#if state === FormState.Success}
		<div class="notification is-success mt-5">
			<div class="columns is-mobile is-vcentered">
				<div class="column is-narrow">
                    {@html CheckCircle}
				</div>
				<div class="column">
					<p>Vielen Dank für Ihre Nomination.</p>
				</div>
			</div>
		</div>
	{/if}

	{#if state === FormState.Error}
		<div class="notification is-warning mt-5">
			<div class="columns is-mobile is-vcentered">
				<div class="column is-narrow">
                    <div class="icon is-large">
                        {@html WarningTriangle}
                    </div>
				</div>
				<div class="column">
					{#if error != null}
						<p>
							<strong>{error.title}</strong><br />
							{error.detail ?? ""}
						</p>
					{:else}
						<p>Leider hat etwas nicht funktioniert.</p>
						<p>Bitte wende dich per E-Mail an <a href="mailto:verein@bitcoin-alps.ch">verein@bitcoin-alps.ch</a>.</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
