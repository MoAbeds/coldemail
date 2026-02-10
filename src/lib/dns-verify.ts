import dns from "dns";
import { promisify } from "util";

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

function getDomain(email: string): string {
  return email.split("@")[1];
}

interface DnsCheckResult {
  configured: boolean;
  records: string[];
  details: string;
}

export async function checkSpf(email: string): Promise<DnsCheckResult> {
  const domain = getDomain(email);
  try {
    const records = await resolveTxt(domain);
    const flat = records.map((r) => r.join(""));
    const spfRecords = flat.filter((r) => r.startsWith("v=spf1"));

    if (spfRecords.length === 0) {
      return {
        configured: false,
        records: [],
        details: "No SPF record found. Add a TXT record starting with 'v=spf1'.",
      };
    }

    return {
      configured: true,
      records: spfRecords,
      details: `SPF record found: ${spfRecords[0]}`,
    };
  } catch {
    return {
      configured: false,
      records: [],
      details: "Could not query DNS records for this domain.",
    };
  }
}

export async function checkDkim(
  email: string,
  selector: string = "default"
): Promise<DnsCheckResult> {
  const domain = getDomain(email);
  const dkimDomain = `${selector}._domainkey.${domain}`;

  try {
    const records = await resolveTxt(dkimDomain);
    const flat = records.map((r) => r.join(""));
    const dkimRecords = flat.filter(
      (r) => r.includes("v=DKIM1") || r.includes("p=")
    );

    if (dkimRecords.length === 0) {
      return {
        configured: false,
        records: [],
        details: `No DKIM record found at ${dkimDomain}. Check your selector name.`,
      };
    }

    return {
      configured: true,
      records: dkimRecords,
      details: "DKIM record found and configured.",
    };
  } catch {
    return {
      configured: false,
      records: [],
      details: `No DKIM record at ${dkimDomain}. Try selectors: google, selector1, s1.`,
    };
  }
}

export async function checkDmarc(email: string): Promise<DnsCheckResult> {
  const domain = getDomain(email);
  const dmarcDomain = `_dmarc.${domain}`;

  try {
    const records = await resolveTxt(dmarcDomain);
    const flat = records.map((r) => r.join(""));
    const dmarcRecords = flat.filter((r) => r.startsWith("v=DMARC1"));

    if (dmarcRecords.length === 0) {
      return {
        configured: false,
        records: [],
        details: "No DMARC record found. Add a TXT record at _dmarc.yourdomain.com.",
      };
    }

    return {
      configured: true,
      records: dmarcRecords,
      details: `DMARC policy found: ${dmarcRecords[0]}`,
    };
  } catch {
    return {
      configured: false,
      records: [],
      details: "Could not query DMARC records.",
    };
  }
}

export async function checkMx(email: string): Promise<boolean> {
  const domain = getDomain(email);
  try {
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

export async function runFullDnsCheck(email: string) {
  const [spf, dkim, dmarc] = await Promise.all([
    checkSpf(email),
    checkDkim(email, "default").then(async (r) => {
      if (r.configured) return r;
      // Try common selectors
      for (const sel of ["google", "selector1", "selector2", "s1", "s2"]) {
        const result = await checkDkim(email, sel);
        if (result.configured) return result;
      }
      return r;
    }),
    checkDmarc(email),
  ]);

  return { spf, dkim, dmarc };
}
