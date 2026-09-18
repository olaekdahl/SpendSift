const processorPrefixes = /^(?:PAYPAL\s*\*|SQ\s*\*|TST\s*\*)\s*/u;
const trailingReference = /(?:\s+(?:#|REF\s*)?[A-Z0-9-]*\d[A-Z0-9-]{2,})+$/u;
const noisyWords =
  /\b(?:CARD PURCHASE|DEBIT CARD|ONLINE PAYMENT|POS PURCHASE)\b/gu;

export function normalizeMerchant(
  description: string,
  aliases: ReadonlyMap<string, string> = new Map(),
) {
  const canonicalDescription = description
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleUpperCase("en-US");
  const aliased = aliases.get(canonicalDescription) ?? canonicalDescription;
  const withoutNoise = aliased
    .replace(processorPrefixes, "")
    .replace(noisyWords, " ")
    .replace(trailingReference, "")
    .replace(/\s+/gu, " ")
    .trim();

  return (withoutNoise || aliased).slice(0, 200);
}

export function merchantDisplayName(normalizedMerchant: string) {
  return normalizedMerchant
    .toLocaleLowerCase("en-US")
    .replace(/(^|[\s&/.-])\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"))
    .slice(0, 120);
}
