import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-xl rounded border border-line bg-surface/90 p-8 sm:p-10">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-bright sm:text-3xl">
          La página no existe
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          La ruta solicitada no forma parte de WVCM.
        </p>
        <Link className="btn mt-7" href="/">
          Volver a WVCM
        </Link>
      </section>
    </main>
  );
}
