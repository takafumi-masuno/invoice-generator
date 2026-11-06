const SOURCE_URL = "https://github.com/takafumi-masuno/invoice-generator";
const AUTHOR_URL = "https://takafumi-masuno.github.io/";

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground underline underline-offset-4 hover:no-underline"
    >
      {children}
    </a>
  );
}

export function AppFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-muted-foreground">
        <p>
          作成した書類が税務上有効であることは保証しません。判断に迷う場合は税理士や税務署に確認してください。
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <FooterLink href={SOURCE_URL}>ソースコード（GitHub）</FooterLink>
          <span>
            作者: <FooterLink href={AUTHOR_URL}>Takafumi Masuno</FooterLink>
          </span>
        </p>
      </div>
    </footer>
  );
}
