import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  activateLocalInvitation,
  changeLocalPassword,
  LocalAuthRequestError,
} from "../../lib/auth/localSession";
import { useSession } from "../../lib/auth";
import { Link, useLocationSearch, useRouter } from "../../lib/router";
import { AuthPageShell } from "./authPageShell";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { SettingsPanel } from "../settings/settingsPage";

function LocalAccountShell({ children, eyebrow }) {
  return <AuthPageShell eyebrow={eyebrow}>{children}</AuthPageShell>;
}

function FormMessage({ children, error = false }) {
  if (!children) {
    return null;
  }

  return (
    <div
      aria-live={error ? "assertive" : "polite"}
      className={
        error
          ? "rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
          : "rounded-lg border border-success/30 bg-success/10 px-3.5 py-3 text-sm text-foreground"
      }
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export function LocalActivationPage() {
  const router = useRouter();
  const { update } = useSession();
  const { t } = useTranslation();
  const search = useLocationSearch();
  const token = new URLSearchParams(search).get("token") ?? "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    if (!token) {
      setErrorMessage(t("auth.invitationMissingToken"));
      return;
    }
    if (password !== confirmation) {
      setErrorMessage(t("auth.passwordsDoNotMatch"));
      return;
    }
    if (password.length < 12) {
      setErrorMessage(t("auth.passwordMinLength"));
      return;
    }

    setIsSubmitting(true);
    try {
      await activateLocalInvitation(token, password, name);
      await update();
      router.replace("/");
    } catch (error) {
      setErrorMessage(
        error instanceof LocalAuthRequestError && error.status === 400
          ? error.message
          : t("auth.invitationInvalid")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <LocalAccountShell eyebrow={t("auth.workspaceInvitation")}>
      <header className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.setUpAccount")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("auth.choosePassword")}
        </p>
      </header>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <FormMessage error>
          {errorMessage || (!token ? t("auth.invitationMissingToken") : "")}
        </FormMessage>
        <div className="grid gap-2">
          <Label htmlFor="activation-name">
            {t("auth.name")} <span className="font-normal text-muted-foreground">({t("common.optional")})</span>
          </Label>
          <Input
            autoComplete="name"
            id="activation-name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="activation-password">{t("auth.password")}</Label>
          <Input
            autoComplete="new-password"
            id="activation-password"
            minLength={12}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="activation-confirm-password">{t("auth.confirmPassword")}</Label>
          <Input
            autoComplete="new-password"
            id="activation-confirm-password"
            minLength={12}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            type="password"
            value={confirmation}
          />
        </div>
        <Button
          className="mt-1 h-10 w-full"
          disabled={isSubmitting || !token}
          type="submit"
        >
          {isSubmitting ? t("auth.activating") : t("auth.activateAccount")}
        </Button>
      </form>
      <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
        {t("auth.alreadyActivated")}{" "}
        <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/login">
          {t("auth.signIn")}
        </Link>
      </p>
    </LocalAccountShell>
  );
}

export function LocalChangePasswordPage() {
  const { update } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (newPassword !== confirmation) {
      setErrorMessage(t("auth.passwordsDoNotMatch"));
      return;
    }
    if (newPassword.length < 12) {
      setErrorMessage(t("auth.passwordMinLength"));
      return;
    }

    setIsSubmitting(true);
    try {
      await changeLocalPassword(currentPassword, newPassword);
      await update();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setSuccessMessage(t("auth.passwordChanged"));
    } catch (error) {
      setErrorMessage(
        error instanceof LocalAuthRequestError && error.status === 400
          ? error.message
          : t("auth.unableToChangePassword")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SettingsPanel className="max-w-2xl overflow-hidden">
      <header className="border-b border-border/70 p-4 sm:p-5">
        <h2 className="text-base font-medium tracking-tight">{t("auth.changePassword")}</h2>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {t("auth.newPasswordDescription")}
        </p>
      </header>
      <form className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5" onSubmit={handleSubmit}>
        <div className="sm:col-span-2">
          <FormMessage error>{errorMessage}</FormMessage>
          <FormMessage>{successMessage}</FormMessage>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="current-password">{t("auth.currentPassword")}</Label>
          <Input
            autoComplete="current-password"
            id="current-password"
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            type="password"
            value={currentPassword}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
          <Input
            autoComplete="new-password"
            id="new-password"
            minLength={12}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-new-password">{t("auth.confirmNewPassword")}</Label>
          <Input
            autoComplete="new-password"
            id="confirm-new-password"
            minLength={12}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            type="password"
            value={confirmation}
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button onClick={() => router.back()} type="button" variant="outline">
            {t("common.cancel")}
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? t("auth.saving") : t("auth.changePassword")}
          </Button>
        </div>
      </form>
    </SettingsPanel>
  );
}
