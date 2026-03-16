type Props = {
  ko: string;
  en: string;
  inline?: boolean;
};

export function LangText({ ko, en, inline = false }: Props) {
  return (
    <span className={`lang-switch${inline ? " inline" : ""}`}>
      <span className="lang-ko">{ko}</span>
      <span className="lang-en">{en}</span>
    </span>
  );
}
