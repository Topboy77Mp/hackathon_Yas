interface ResourceStateProps {
  title: string;
  description?: string;
  retry?: () => void;
}

export function LoadingState({ title }: Pick<ResourceStateProps, "title">) {
  return <section className="resource-state" aria-busy="true"><div className="loading-line" /><p>{title}</p></section>;
}

export function ErrorState({ title, description, retry }: ResourceStateProps) {
  return (
    <section className="resource-state resource-error" role="alert">
      <h1>{title}</h1>
      <p>{description ?? "Une erreur est survenue. Réessayez dans un instant."}</p>
      {retry && <button className="button button-secondary" onClick={retry} type="button">Réessayer</button>}
    </section>
  );
}
