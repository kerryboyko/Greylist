export function normalizeUrl(input: string): string {
    const url = new URL(input);
    url.hash = "";
    return url.toString();
}