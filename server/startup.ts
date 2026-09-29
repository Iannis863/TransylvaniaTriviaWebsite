/** Share an initialization attempt, but let the next request retry after a failure. */
export function retryableInitialization<T>(initialize: () => Promise<T>) {
  let ready: Promise<T> | undefined;
  return (): Promise<T> => {
    if (!ready) {
      ready = Promise.resolve().then(initialize).catch(error => {
        ready = undefined;
        throw error;
      });
    }
    return ready;
  };
}

export function startupFailure(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  if (code === "DATABASE_URL_MISSING") {
    return {
      code,
      message: "Baza de date nu este configurată. Contactează administratorul.",
    };
  }
  if (code === "DATABASE_UNAVAILABLE") {
    return { code, message: "Conexiunea cu baza de date este temporar indisponibilă. Încearcă din nou în câteva momente." };
  }
  if (code === "DATABASE_URL_INVALID") {
    return { code, message: "Conexiunea bazei de date nu este configurată corect. Contactează administratorul." };
  }
  return { code: "BACKEND_STARTUP_FAILED", message: "Serverul nu a putut porni. Încearcă din nou în câteva momente." };
}
