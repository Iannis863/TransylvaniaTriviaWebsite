import { Component, type ReactNode } from "react";
import { t } from "@/lib/i18n";

// A stale lazy chunk after a deployment or an unexpected render failure must
// leave a usable recovery action instead of an empty page.
export default class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main role="alert" className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#07020d] p-8 text-center text-purple-100">
      <h1 className="text-3xl font-heading">{t("Pagina nu a putut fi încărcată.")}</h1>
      <button className="gold-btn rounded-full px-6 py-3" onClick={() => window.location.reload()}>{t("Reîncarcă pagina")}</button>
    </main>;
  }
}
