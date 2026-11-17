# SEO and launch checklist

Goal: when an Indian broker or builder searches for an AI or WhatsApp tool for property sales,
this site appears near the top. No one can guarantee position #1 on Google. Rankings come from
relevant pages, a fast and correct site, and other sites linking to you, and they build over months.
This document lists what the code already does and what has to happen outside the code.

## What the site does (in code)

| Area             | What is in place                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Pages per intent | Home + 5 solution pages + 3 guides, each aimed at one kind of search (`apps/web/src/lib/marketing-content.ts`)         |
| On-page          | Unique `<title>` (≤ 65 chars) and meta description per page, one H1 with the search phrase, breadcrumbs, FAQs          |
| Structured data  | Organization, WebSite, SoftwareApplication, FAQPage, BreadcrumbList, Article (JSON-LD)                                 |
| Crawling         | `/robots.txt` (app blocked), `/sitemap.xml` (every public page), canonical URLs, real 404s, app pages `noindex`        |
| Sharing          | Open Graph / Twitter card image for WhatsApp, LinkedIn, X, Facebook previews                                           |
| Speed            | Static pages, preloaded self-hosted fonts, optimised images. Lighthouse SEO 100, accessibility 100, performance 95–100 |
| Internal links   | Header, footer, home "Solutions" section and "Related" blocks connect every page                                       |
| Guard rails      | `apps/web/e2e/seo.spec.ts` fails CI if a page loses its H1, title, description, canonical or structured data           |

Target searches (examples): "WhatsApp AI for real estate", "AI sales agent for real estate India",
"AI for real estate builders", "real estate lead management software", "Hinglish chatbot for real
estate", "how to respond to 99acres leads", "WhatsApp 24 hour rule".

## What only you can do

0. **Fill in your company details** in `apps/web/src/lib/company.ts` (legal name, address, support
   email, Grievance Officer). They appear on About, Contact, Privacy and Terms, and Meta checks them
   during WhatsApp business verification. Have a lawyer review the Privacy Policy and Terms
   (`apps/web/src/app/(marketing)/privacy` and `terms`) — they are careful drafts, not legal advice.
1. **Choose a brand name and a domain.** "AI Real Estate Sales Employee" describes the product but
   is hard to remember and to search for. A short brand on a `.in` or `.com` domain helps people
   find you again. Then set `NEXT_PUBLIC_SITE_URL` to it.
2. **Deploy the site publicly over HTTPS.** Google cannot rank `localhost`.
3. **Google Search Console.** Add the domain, verify it (or set
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`), submit `https://<domain>/sitemap.xml`, and use
   _URL inspection → Request indexing_ on the home and solution pages.
4. **Bing Webmaster Tools.** Import from Search Console (two clicks; also feeds some AI search tools).
5. **Google Business Profile** for your company, with the website link.
6. **Get listed where buyers of software look:** Product Hunt, G2, Capterra / GetApp, SaaSworthy,
   and Indian startup directories. Each listing is a genuine link back to the site.
7. **Earn links and mentions:** a guest post on a proptech blog, a LinkedIn article, a talk at a
   local brokers' association, a case study with your first customer (with permission).
8. **Real reviews and a real case study** once you have customers. Never add invented ones;
   Google penalises fake reviews and buyers notice.
9. **Publish one useful guide a month.** Add it to `GUIDES` in `marketing-content.ts`; it appears
   in the sitemap, the guides index and the footer automatically. Good topics: portal lead
   follow-up, Click-to-WhatsApp ads for real estate, RERA basics for sales teams, reducing site-visit
   no-shows.
10. **Measure.** Search Console's _Performance_ report shows which searches find you and your
    position for each. Improve the pages that sit at positions 5–20 first.

## Later

- Hindi versions of the key pages (`hreflang="hi-IN"`), since many buyers and brokers search in Hindi.
- Customer stories — buyers search for proof before they contact a vendor.
- Comparison pages ("vs spreadsheets", "vs a basic WhatsApp chatbot"), written fairly.
