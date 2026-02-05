// components/layout/Footer.tsx
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-white/10 py-4 text-center text-xs text-white/40">
      <span>
        © {year} · Hecho por{" "}
        <a
          href="https://github.com/matias-senia" // cambiá si preferís LinkedIn
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/60 hover:text-white transition-colors"
        >
          Matías Senia
        </a>
      </span>
    </footer>
  );
}
