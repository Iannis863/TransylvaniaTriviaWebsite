/** Natural Earth uses -99 for a few ISO codes, including France and Norway. */
export function countryCode(properties: { ISO_A3: string; ADM0_A3?: string }): string {
  return properties.ISO_A3 === "-99" ? properties.ADM0_A3 ?? properties.ISO_A3 : properties.ISO_A3;
}
