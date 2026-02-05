export function Footer() {
  return (
    <footer className="py-4 border-t border-border">
      <p className="text-xs text-muted-foreground text-center">
        © {new Date().getFullYear()}{" "}
        <a
          href="https://sinapsehealthcare.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Sinapse Health Care
        </a>
        . Todos os direitos reservados.
      </p>
    </footer>
  );
}
