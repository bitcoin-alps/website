<script lang="ts">
	import type { Snippet } from "svelte";
	import ky from "ky";
	import { test, enforce, only, omitWhen } from "vest";
	import { ProblemDocument } from "http-problem-details";
	import "vest/enforce/email";

	import CheckCircle from "/src/icons/check-circle.svg?raw";
	import WarningTriangle from "/src/icons/warning-triangle.svg?raw";

	import TextField from "./TextField.svelte";
	import { FormState } from "./models";
	import { ValidatingStore } from "./validating-store";
	import { createNsId } from "./utility";

	const nsId = createNsId("CourseRegistration");

	interface CourseRegistrationRequest {
		eventName: string;
		eventDate: string;
		firstname: string;
		lastname: string;
		email: string;
		phone: string;
		acceptTos: boolean;
	}

	interface Props {
		eventName: string;
		eventDate: string;
		cutoffDate?: string;
		disabled?: boolean;
		children?: Snippet;
	}

	let { eventName, eventDate, cutoffDate, disabled = false, children }: Props = $props();

	const tosUrl = "/akademie/kursbedingungen";
	const action: string = "/api/academy-ticket";
	const initialData: CourseRegistrationRequest = {
		eventName: eventName,
		eventDate: eventDate,
		firstname: "",
		lastname: "",
		email: "",
		phone: "",
		acceptTos: false,
	};
	const validationFunc = (data: CourseRegistrationRequest) => {
		test("firstname", "Bitte gib deinen vollen Namen an.", () => {
			enforce(data.firstname).isNotEmpty();
		});
		test("lastname", "Bitte gib deinen vollen Namen an.", () => {
			enforce(data.lastname).isNotEmpty();
		});
		test("email", "Bitte gib deine E-Mail-Adresse an.", () => {
			enforce(data.email).isNotEmpty().isEmail();
		});
		test("acceptTos", "Du musst die Anmeldebedingungen akzeptieren um fortzufahren.", () => {
			enforce(data.acceptTos).equals(true);
		});
	};
	let formState: FormState = $state(FormState.Initial);
	let store = new ValidatingStore(initialData, validationFunc);
	let error: ProblemDocument | null = $state(null);
	let isModalOpen = $state(false);

	const isPastCutoff = $derived(cutoffDate ? new Date() > new Date(cutoffDate) : false);
	const isDisabled = $derived(isPastCutoff || disabled);
	const buttonTooltip = $derived(isPastCutoff ? "Keine Anmeldung mehr möglich" : disabled ? "Zurzeit keine Anmeldung möglich" : null);

	function openModal() {
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
	}

	async function submit() {
		try {
			if (!store.validate()) {
				return;
			}

			let data = store.getData();

			formState = FormState.Loading;
			let response = await ky.post(action, {
				json: data,
				throwHttpErrors: false,
			});
			if (!response.ok) {
				error = await response.json<ProblemDocument>();
				formState = FormState.Error;
				return;
			}

			formState = FormState.Success;
		} catch (e) {
			formState = FormState.Error;
		}
	}
</script>

<span class:has-tooltip={isDisabled} data-tooltip={buttonTooltip}>
	<button class="button is-primary is-small is-responsive" disabled={isDisabled} onclick={openModal}>
		{@render children?.()}
	</button>
</span>

<div class="modal" class:is-active={isModalOpen}>
	<div class="modal-background" onclick={closeModal}></div>
	<div class="modal-card">
		<header class="modal-card-head">
			<div class="modal-card-title">Anmeldung</div>
			<button class="delete" aria-label="close" onclick={closeModal}></button>
		</header>
		<section class="modal-card-body">
			<div class="academy-ticket-form">
				<h3 class="mb-1">{eventName}</h3>
				<p class="is-size-6">{eventDate}</p>

				{#if formState === FormState.Initial || formState === FormState.Loading}
					<div class="columns is-multiline is-mobile mt-4">
						<div class="column is-12-touch is-6-desktop">
							<TextField label="Vorname" autocomplete="given-name" name="firstname" {store} />
						</div>
						<div class="column is-12-touch is-6-desktop">
							<TextField label="Nachname" autocomplete="family-name" name="lastname" {store} />
						</div>
						<div class="column is-12">
							<TextField label="E-Mail" type="email" autocomplete="email" name="email" {store} />
						</div>
						<div class="column is-12">
							<TextField label="Telefon (optional)" type="tel" autocomplete="tel" name="phone" {store} />
						</div>
						<div class="column is-12">
							<div class="field">
								<input class="is-checkradio is-primary" id={nsId("acceptTos")} name="acceptTos" type="checkbox" bind:checked={$store.acceptTos.value} />
								<label for={nsId("acceptTos")}>Ich habe <a class="has-underline" href={tosUrl} target="_blank">die Allgemeinen Kurs­bedingungen</a> gelesen und akzeptiere sie.</label>
							</div>
							{#each $store.acceptTos.errors as error}
								<p class="help is-danger">{error}</p>
							{/each}
						</div>
					</div>
				{/if}

				{#if formState === FormState.Success}
					<div class="notification is-success mt-5">
						<div class="columns is-mobile is-vcentered">
							<div class="column is-narrow">
								{@html CheckCircle}
							</div>
							<div class="column">
								<p>Vielen Dank für deine Anmeldung zu <span class="has-text-primary">{eventName}</span>.</p>
								<p>Du erhältst in Kürze ein E-Mail mit weiteren Informationen.</p>
							</div>
						</div>
					</div>
				{/if}

				{#if formState === FormState.Error}
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
		</section>
		{#if formState === FormState.Initial || formState === FormState.Loading}
			<footer class="modal-card-foot is-justify-content-center">
				<button class="button is-primary" class:is-loading={formState === FormState.Loading} onclick={submit}>Anmelden</button>
			</footer>
		{/if}
	</div>
</div>

<style lang="scss">
	.has-tooltip {
		position: relative;
		display: inline-block;
		cursor: not-allowed;

		&::after {
			content: attr(data-tooltip);
			position: absolute;
			bottom: 100%;
			left: 50%;
			transform: translateX(-50%);
			background: #4a4a4a;
			color: #fff;
			padding: 0.35rem 0.75rem;
			border-radius: 4px;
			font-size: 0.75rem;
			white-space: nowrap;
			pointer-events: none;
			opacity: 0;
			transition: opacity 0.2s;
			margin-bottom: 4px;
		}

		&:hover::after {
			opacity: 1;
		}
	}
</style>
