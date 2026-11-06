import { Component, type ReactNode, Suspense } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = { errorMessage: string; children: ReactNode };

/**
 * 読み込みに失敗すると、React は一番近い境界まで画面を破棄する。境界がないと全体が白くなる。
 * 公開し直した直後の古いタブでは、前のバージョンのファイルが見つからずに失敗することがある。
 * 失敗の結果は React.lazy が記憶していて再試行できないので、再読み込みを案内する。
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Alert variant="destructive" className="flex flex-col items-start gap-2">
        <AlertDescription>{this.props.errorMessage}</AlertDescription>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          ページを再読み込み
        </Button>
      </Alert>
    );
  }
}

/** 遅延読み込みする画面を囲み、読み込み中と失敗したときの表示を出す */
export function LazyBoundary({
  loadingMessage,
  errorMessage,
  children,
}: {
  loadingMessage: string;
  errorMessage: string;
  children: ReactNode;
}) {
  return (
    <ErrorBoundary errorMessage={errorMessage}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{loadingMessage}</p>}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
