/** Renders a JSON-LD script tag. Server-only — never pass user-controlled
 *  strings that haven't already been through the normal render path. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
