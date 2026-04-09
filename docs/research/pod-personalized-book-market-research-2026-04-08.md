# POD Personalized Children's Book Market Research
## For story.dodam.life — AI Children's Storybook + Physical Book Publishing

**Date**: 2026-04-08
**Product Spec**: Hardcover, 20x20cm, 20-30 pages, 29,900-39,900 KRW (~$21-28 USD)

---

## 1. POD API Provider Comparison

### 1.1 Gelato (RECOMMENDED for Korea)

| Attribute | Detail |
|-----------|--------|
| **API** | REST API, well-documented. POST to `https://order.gelatoapis.com/v4/orders` with X-API-KEY auth |
| **File formats** | JPEG, PNG, SVG, PDF (multi-page PDF for photo books) |
| **Photo book specs** | 8x8in (20.32x20.32cm) hardcover available, 30-200 pages, 170gsm silk paper |
| **Base price (non-subscriber)** | From $19.99 per hardcover photo book |
| **Base price (Gelato+ subscriber)** | From $11.85 per hardcover photo book (up to 25% off) |
| **Gelato+ subscription** | $23.99/month or $19.99/month billed annually ($239.88/yr) |
| **Korea production** | YES - Gelato has local production in South Korea (launched 2023). Part of 140+ production hubs in 32 countries. 95% of orders produced in same country as delivery |
| **Korea delivery** | Standard 2-4 days domestic (if locally produced), 4-6 days international. Addresses must be in Korean |
| **Turnaround** | 5-6 days average from order to delivery |
| **Integrations** | Shopify, Etsy, WooCommerce, custom API |
| **Key advantage** | Local Korean production = fastest delivery, lowest shipping cost, reduced carbon footprint |
| **Key limitation** | Photo books start at 30 pages minimum (our spec of 20 pages may need padding or negotiation) |

**Sources**: [Gelato API Docs](https://dashboard.gelato.com/docs/), [Gelato Pricing](https://www.gelato.com/pricing), [Gelato Children's Books](https://www.gelato.com/products/childrens-books), [Gelato Korea Production](https://whattheythink.com/news/93958-gelato-includes-japan-caribbean-mexico-uae-south-korea-global-network/)

---

### 1.2 Lulu

| Attribute | Detail |
|-----------|--------|
| **API** | REST API with OpenID Connect auth. Full docs at `api.lulu.com/docs/` |
| **Sandbox** | Yes, sandbox environment for testing |
| **Key endpoints** | Print-Job (create orders), Print-Job-cost-calculations (price estimation without creating order), webhooks for status updates |
| **Square formats** | 8.5x8.5in square available, full-color printing |
| **Hardcover color pricing** | ~$12.30/unit (200pg B&W) to ~$27.50/unit (hardcover premium color) |
| **Fulfillment fee** | $1.75 per order via Lulu Direct |
| **Distribution commission** | 20% of gross profit for distribution services |
| **Korea shipping** | International shipping available, but NO local Korean production |
| **Turnaround** | 3-5 business days production + international shipping (7-14 days total to Korea) |
| **Key advantage** | Best color quality for POD (80# coated paper), excellent API documentation |
| **Key limitation** | No Korean production facility = longer shipping, higher shipping costs to Korea |

**Sources**: [Lulu API Docs](https://api.lulu.com/docs/), [Lulu Print API](https://www.lulu.com/sell/sell-on-your-site/print-api), [Lulu Pricing](https://www.lulu.com/pricing)

---

### 1.3 Blurb

| Attribute | Detail |
|-----------|--------|
| **API** | Print API available for both small and large businesses. No minimums. |
| **Photo book specs** | Multiple sizes including square formats. 24+ pages |
| **Pricing examples** | 6x9 softcover economy color: $4.99. 8x10 ImageWrap hardcover: from $22.99. 5x8 hardcover with dust jacket: from $20.99 |
| **Est. 8x8 hardcover 24pg** | ~$18-25 (estimated based on size range) |
| **Volume discounts** | 20+ copies discount, 100+ custom quotes |
| **Korea shipping** | International shipping, no local Korean production |
| **Key advantage** | High quality, premium paper options, layflat available |
| **Key limitation** | No Korean production, higher shipping costs, pricing tends higher for photo books |

**Sources**: [Blurb Print API](https://www.blurb.com/print-api-software), [Blurb Pricing](https://www.blurb.com/pricing)

---

### 1.4 Peecho

| Attribute | Detail |
|-----------|--------|
| **API** | Free API, no sign-up or subscription fees. Pay only per product printed/shipped |
| **Products** | Hardcover, softcover, layflat books. 24-504 pages |
| **Paper options** | Gloss or uncoated |
| **Pricing model** | Per-product pricing (calculator on website), no subscription |
| **Korea shipping** | International shipping available |
| **Key advantage** | Free API, no fixed costs, good for apps/platforms integration |
| **Key limitation** | Less documentation than Gelato/Lulu, no Korean production, pricing not publicly listed |

**Sources**: [Peecho API](https://www.peecho.com/solutions/print-api), [Peecho Books](https://www.peecho.com/products/books)

---

### 1.5 Korean POD Services

#### 부크크 (Bookk.co.kr)

| Attribute | Detail |
|-----------|--------|
| **API** | NO public API. Manual upload process only |
| **Minimum pages** | 50 pages minimum (does NOT meet our 20-30 page spec) |
| **B&W 250p pricing** | 13,400 KRW base price |
| **Color 250p pricing** | 16,000 KRW base price (B5/A4) |
| **Color per-page cost** | ~50-100 KRW/page additional |
| **Hardcover** | Information not confirmed for hardcover availability |
| **Royalties** | 35% on Bookk sales, 15% on external distribution |
| **Distribution** | Kyobo, Aladin, Yes24 with ISBN |
| **Key limitation** | No API, 50-page minimum, no confirmed hardcover for short picture books |

#### 교보문고 바로출판 (Kyobo PubPle POD)

| Attribute | Detail |
|-----------|--------|
| **API** | NO public API. Web-based submission process |
| **Format** | 양장 (hardcover) and 무선 (paperback) available |
| **Pricing** | Based on binding type + page count + color. 양장 is 3x+ more expensive than 무선 |
| **Key advantage** | Direct distribution on Kyobo (Korea's largest bookstore) |
| **Key limitation** | No API integration, designed for traditional self-publishing, not automated fulfillment |

**Assessment**: Korean POD services (부크크, 교보문고) are NOT suitable for automated API integration. They lack APIs and are designed for manual self-publishing workflows, not real-time order fulfillment from an app.

**Sources**: [부크크 (Namu Wiki)](https://namu.wiki/w/%EB%B6%80%ED%81%AC%ED%81%AC), [교보문고 POD](https://product.kyobobook.co.kr/pod/main), [Bookk.co.kr](https://bookk.co.kr/)

---

### 1.6 Provider Recommendation Matrix

| Criterion | Gelato | Lulu | Blurb | Peecho | Korean POD |
|-----------|--------|------|-------|--------|------------|
| API Quality | A | A | B+ | B | F (none) |
| Korea Local Production | YES | No | No | No | Yes |
| Hardcover Photo Book | Yes | Yes | Yes | Yes | Limited |
| 20x20cm/8x8 Square | Yes | Yes (8.5x8.5) | Yes | Yes | No/Limited |
| Min Pages | 30 | 24 | 20+ | 24 | 50 |
| Est. Unit Cost | $12-20 | $15-28 | $18-25 | $15-22 | ~$10-16 |
| Delivery to Korea | 2-6 days | 7-14 days | 7-14 days | 7-14 days | 1-3 days |
| Webhook/Tracking | Yes | Yes | Limited | Limited | No |

**RECOMMENDATION**: **Gelato as primary provider** due to Korean local production, competitive pricing with Gelato+ subscription, robust API, and fast domestic delivery. Consider Lulu as backup for quality-critical orders.

---

## 2. Competitor Analysis: AI-to-Physical Book Services

### 2.1 Direct Competitors (AI + Print)

| Company | Price (Hardcover) | Pages | AI Features | Print Quality | Turnaround |
|---------|-------------------|-------|-------------|---------------|------------|
| **Storique** (storique.ai) | 59.50 CHF (~$67 USD) | 26-40 | Custom AI model trained on child's photos, 100+ illustrations, human editorial review | Premium hardcover, highest quality | 24hr for digital draft |
| **Custom Heroes** (customheroes.ai) | $49 (12pg), $54 (16pg), $59 (20pg) | 12-20 | Photo-to-character AI, 5 revisions included, save characters for reuse | Professional hardcover + digital PDF | 3-5 business days shipping |
| **Magical Children's Book** | $34.99 hardcover | 24 | AI-generated from uploaded photos | Hardcover | Standard shipping |
| **Childbook.ai** | $29.99 hardcover, $24.99 softcover, $39.99 premium layflat | varies | AI story + illustration generation | Multiple tiers | Varies |
| **Lullaby.ink** | $29.99 hardcover, $24.99 softcover | varies | Photo-to-cartoon, story-aware outfits, custom backgrounds, up to 3 characters | Multiple options | Varies |
| **Magic Story** | $24.99 hardcover, $19.99 softcover | varies | Pixar-quality AI illustrations, photo-based | High quality | Standard |
| **ToonyStory** | From $29.99 hardcover | varies | AI story generation, multiple art styles | Hardcover available | Standard |
| **MakeMyBook** | From EUR 8 hardcover + shipping | varies | AI story + illustration | Basic to premium | Standard |
| **Make A Book** | $59.95 premium hardcover, $49.95 paperback | varies | AI personalization | Premium | Standard |
| **LoveToRead.ai** | $24.99 premium hardback | varies | AI-powered | Hardback | Standard |
| **Imagitime** | $54.99 hardcover (US) | varies | AI-powered personalization | High-quality binding, premium paper | Standard |

### 2.2 Traditional Personalized Book Companies (Non-AI)

| Company | Price | Books Sold | Notable |
|---------|-------|------------|---------|
| **Wonderbly** (formerly Lost My Name) | $20-$39.99 | 11M+ books in 140+ countries | Acquired by Penguin Random House (June 2025). Founded 2012. Raised $28.7M total. Graphite Capital led $46M buyout in 2021. Revenue ~$3.1M/yr (2021). |
| **Hooray Heroes** | From $39.00 | 3M+ personalizations | Template-based customization (name, gender, skin/hair/eye color). US printing. |
| **I See Me** | $15-$40 | N/A | Long-running personalized book brand |

### 2.3 Korean Market Competitors

No significant Korean AI personalized children's book services were identified. The market appears to be an **unoccupied niche** in Korea. Existing services (루미의 책장, 교보문고, 리디북스) focus on standard ebook/book sales, not personalization.

**Sources**: [Storique Pricing](https://www.storique.ai/pricing), [Custom Heroes](https://www.customheroes.ai/), [Lullaby.ink Comparison](https://lullaby.ink/blog/best-personalized-childrens-books-2026), [Wonderbly/PRH Acquisition](https://kidscreen.com/2025/06/06/penguin-random-house-acquires-wonderbly/), [Wonderbly Wikipedia](https://en.wikipedia.org/wiki/Wonderbly), [TechCrunch on Wonderbly](https://techcrunch.com/2017/07/31/wonderbly/)

---

## 3. Market Size Data

### 3.1 Personalized Children's Book Market

| Metric | Value | Source |
|--------|-------|--------|
| **Global market (2024)** | $569M USD | [Business Research Insights](https://www.businessresearchinsights.com/market-reports/personalized-children-books-market-119694) |
| **Projected (2031)** | $1,051M USD | Same |
| **CAGR (2025-2031)** | 9.2% | Same |
| **U.S. market (2024)** | $661.49M USD | [Data Bridge Market Research](https://www.databridgemarketresearch.com/reports/us-personalized-childrens-books-market) |
| **U.S. projected (2032)** | $1,128.52M USD | Same |
| **U.S. CAGR** | 7.10% | Same |
| **Global personalized story books (2024)** | $1.42B USD | [DataIntelo](https://dataintelo.com/report/personalized-story-books-for-kids-market) |
| **Projected (2033)** | $2.76B USD | Same |
| **CAGR** | 7.6% | Same |
| **Parent preference for custom books** | 35%+ of parents prefer custom-created books featuring their child as protagonist | Business Research Insights |

### 3.2 AI-Generated Children's Book Market

| Metric | Value | Source |
|--------|-------|--------|
| **Global market (2025)** | $1.8B USD | [DataIntelo AI Report](https://dataintelo.com/report/ai-generated-childrens-book-market) |
| **Projected (2034)** | $9.4B USD | Same |
| **CAGR (2026-2034)** | 20.1% | Same |
| **AI books consumed globally (2025)** | 62M+ (digital + POD) | Same |
| **YoY growth** | 47% increase from 2024 | Same |

### 3.3 Print-on-Demand Market

| Metric | Value | Source |
|--------|-------|--------|
| **Global POD market (2024)** | $9.89B USD | [Straits Research](https://straitsresearch.com/report/print-on-demand-market) |
| **Projected (2033)** | $75.30B USD | Same |
| **CAGR (2025-2033)** | 25.3% | Same |
| **POD Book Services (2024)** | $4.5B USD | [Verified Market Reports](https://www.verifiedmarketreports.com/product/print-on-demand-book-service-market/) |
| **POD Book Services projected (2033)** | $12.5B USD | Same |
| **POD Book CAGR** | 12.5% | Same |

### 3.4 Children's Book Market (Overall)

| Metric | Value | Source |
|--------|-------|--------|
| **Global children's books (2025)** | $39.78B USD | [Business Research Insights](https://www.businessresearchinsights.com/market-reports/children-s-books-market-124539) |
| **Projected (2033)** | $69.60B USD | Same |
| **CAGR** | 4.88% | Same |
| **Children's picture books (2025)** | $2.18B USD | [Global Growth Insights](https://www.globalgrowthinsights.com/market-reports/children-picture-book-market-115608) |
| **Picture books projected (2033)** | $3.0B USD | Same |

### 3.5 Korean Market Context

| Metric | Value | Source |
|--------|-------|--------|
| **Korean kids market (projected 2025)** | 58 trillion KRW (~$41B USD) | [더스쿠프](https://www.thescoop.co.kr/news/articleView.html?idxno=302961) |
| **Growth from** | 8 trillion KRW (2002) to 50 trillion KRW (2020) | Same |
| **Premium infant product growth** | 20-30% annually | [플팍스](https://plpax.net/detail.do?seq_board=6434) |
| **Korea fertility rate** | 0.65 (world's lowest) | Same |
| **Ten Pocket (텐포켓) effect** | One child has 10 "wallets" (parents, grandparents, relatives, friends of parents) all spending on one child | [한경용어사전](https://dic.hankyung.com/economy/view/?seq=16164) |
| **Monthly child-rearing cost (2025)** | 1.116M KRW (~$790 USD), first time over 1M | Korea Times |

---

## 4. Pricing Strategy Benchmarks

### 4.1 Global Personalized Hardcover Children's Book Pricing

| Tier | Price Range (USD) | Examples |
|------|-------------------|----------|
| **Budget AI digital** | $2.50-$7.99 | Childbook.ai ($2.50), Lullaby.ink digital ($5) |
| **Mid-range printed** | $19.99-$34.99 | Magic Story ($24.99 HC), Lullaby.ink ($29.99 HC), Childbook.ai ($29.99 HC) |
| **Premium printed** | $35-$59.99 | Wonderbly ($39.99), Hooray Heroes ($39), Custom Heroes ($49-59), Imagitime ($54.99) |
| **Ultra-premium** | $59.95-$67+ | Storique (59.50 CHF), Make A Book ($59.95) |

### 4.2 Price-to-Value Positioning for story.dodam.life

**Target price: 29,900-39,900 KRW ($21-28 USD)**

This positions story.dodam.life at the **lower-to-mid range globally**, which is strategically sound because:

1. **Competitive against global English-language competitors** - Most charge $30-60 USD for hardcover
2. **Strong value proposition for Korean market** - No Korean-language competitors exist for AI personalized children's books
3. **Within "Ten Pocket" impulse gift range** - Under 50,000 KRW is psychologically comfortable for Korean gift-givers
4. **Korean parents spend 1.116M KRW/month on child-rearing** - A 29,900-39,900 KRW book is 2.7-3.6% of monthly childcare spending

### 4.3 Korean Gift Book Pricing Context

| Category | Typical Price (KRW) |
|----------|---------------------|
| Standard Korean children's picture book | 12,000-18,000 |
| Premium imported picture book | 15,000-25,000 |
| **story.dodam.life POD book (target)** | **29,900-39,900** |
| Premium gift book set | 40,000-80,000 |
| Custom photo album (non-book) | 30,000-60,000 |

The 29,900-39,900 KRW target price sits appropriately between "premium picture book" and "personalized gift" territory.

### 4.4 Industry Standard Pricing Tiers (Recommended)

Based on competitor analysis:

| Product | Suggested Price | Rationale |
|---------|-----------------|-----------|
| Digital-only story (existing) | Free/included in subscription | Lead gen for physical |
| Softcover 20x20cm 24pg | 19,900 KRW (~$14) | Entry-level physical product |
| **Hardcover 20x20cm 24pg** | **29,900 KRW (~$21)** | Core product, competitive price |
| Premium hardcover 20x20cm 32pg | 39,900 KRW (~$28) | Premium option with more pages |
| Bundle (2+ books) | 49,900 KRW | Encourage repeat purchase |

---

## 5. Unit Economics & Conversion Rates

### 5.1 Estimated Unit Economics (Gelato, Korean Production)

| Line Item | Cost (USD) | Cost (KRW) | Notes |
|-----------|------------|------------|-------|
| Gelato hardcover 8x8 30pg (Gelato+) | ~$12-15 | ~17,000-21,000 | With Gelato+ subscription discount |
| Domestic Korea shipping | ~$3-5 | ~4,200-7,000 | Local production advantage |
| Packaging/handling | ~$1-2 | ~1,400-2,800 | Included in Gelato pricing |
| Payment processing (3.5%) | ~$0.74-0.98 | ~1,050-1,400 | Based on 29,900 retail |
| **Total COGS** | **~$17-23** | **~23,650-32,200** | |
| **Retail price** | **$21-28** | **29,900-39,900** | |
| **Gross margin** | **$4-5 (19-24%)** | **6,250-7,700** | At 29,900 KRW price |
| **Gross margin (premium)** | **$5-11 (18-39%)** | **7,700-16,250** | At 39,900 KRW price |

### 5.2 Gelato+ Subscription Economics

| Item | Cost |
|------|------|
| Gelato+ monthly | $23.99/month |
| Gelato+ annual | $19.99/month ($239.88/yr) |
| Break-even volume (monthly sub) | ~6 books/month at $4 savings per book |
| Break-even volume (annual sub) | ~5 books/month |

### 5.3 Conversion Rate Benchmarks

| Metric | Rate | Source/Context |
|--------|------|----------------|
| **Freemium to paid (general SaaS)** | 2-5% standard, 6-8% great | [First Page Sage 2026 Report](https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/) |
| **Digital-to-physical upsell** | 1-5% estimated | Industry consensus for digital app to physical merchandise |
| **Post-purchase upsell conversion** | ~4% average, up to 10% top performers | [Focus Digital](https://focus-digital.co/average-upsell-conversion-rate-2025-report/) |
| **Estimated digital story to print order** | 2-5% (conservative), 5-8% (optimistic) | Derived: higher than generic because book is already created/previewed |
| **E-commerce repeat purchase rate** | 20-40% typical, 50%+ for loyal | [Alexander Jarvis](https://www.alexanderjarvis.com/what-is-repeat-purchase-rate-in-ecommerce/) |

### 5.4 Gift Purchase Patterns

| Pattern | Data |
|---------|------|
| **Primary purchase occasions** | Birthdays, Christmas/holidays, 돌잔치 (first birthday), 어린이날 (Children's Day May 5), graduation |
| **Gift vs. self-purchase split** | Estimated 60-70% gift purchases for personalized children's books |
| **"Ten Pocket" multiplier** | Each child has ~10 potential gift-givers (parents, 4 grandparents, aunts/uncles, parents' friends) |
| **Repeat purchase indicators** | Testimonials show customers buying 3-6 books. Wonderbly achieved 75% international sales, indicating strong gift/word-of-mouth |
| **Seasonal peaks** | Q4 (Christmas), May (어린이날), Birthday months, 돌잔치 season |

### 5.5 Revenue Projection Model

**Conservative scenario** (2% digital-to-print conversion):

| Metric | Value |
|--------|-------|
| Monthly active digital story users | 10,000 |
| Print conversion rate | 2% |
| Monthly print orders | 200 |
| Average order value | 34,900 KRW (~$25) |
| Monthly print revenue | 6,980,000 KRW (~$5,000) |
| Annual print revenue | 83,760,000 KRW (~$60,000) |
| Gross margin (25%) | 20,940,000 KRW (~$15,000) |

**Optimistic scenario** (5% conversion, gift multiplier):

| Metric | Value |
|--------|-------|
| Monthly active digital story users | 10,000 |
| Print conversion rate | 5% |
| Monthly print orders | 500 |
| Average order value | 37,400 KRW (~$27, mix of standard + premium) |
| Monthly print revenue | 18,700,000 KRW (~$13,350) |
| Annual print revenue | 224,400,000 KRW (~$160,000) |
| Gross margin (30%) | 67,320,000 KRW (~$48,000) |

---

## 6. Key Strategic Insights

### 6.1 Why This Is a Strong Opportunity

1. **No Korean competitor exists** in AI-personalized children's book printing. The market is completely unoccupied domestically.
2. **Ten Pocket economics** make 29,900-39,900 KRW an easy impulse purchase for 10 potential gift-givers per child.
3. **Korea's record-low fertility rate (0.65)** drives "golden child" spending -- fewer children = more spending per child.
4. **Gelato has Korean production** enabling 2-6 day delivery, which is a significant advantage over all international-only competitors.
5. **Penguin Random House's acquisition of Wonderbly** (June 2025) validates the personalized children's book market at the highest level.
6. **AI-generated children's book market growing at 20.1% CAGR** -- the fastest growing segment in children's publishing.

### 6.2 Key Risks

1. **Gelato's 30-page minimum** may require padding the book (title page, dedication page, coloring pages, etc.) to meet minimum if our stories are under 30 pages.
2. **Thin margins at 29,900 KRW** -- approximately 19-24% gross margin. The 39,900 KRW tier is significantly more profitable (30-39% margin).
3. **Quality perception** -- Korean parents have high expectations for children's book quality. POD quality varies. Must order samples and QA extensively.
4. **Shipping costs sensitivity** -- Even with Korean production, shipping adds 4,200-7,000 KRW to COGS.
5. **AI backlash risk** -- Growing "human-first" movement in publishing (US publishers actively rejecting AI art). Korean market sentiment toward AI illustration is unclear.
6. **Return/refund complexity** -- Physical books are harder to return than digital products.

### 6.3 Recommended Next Steps

1. **Sign up for Gelato API** and create test orders to validate: (a) actual pricing for 20x20cm hardcover, (b) print quality, (c) delivery time to Korean addresses
2. **Design "page padding" strategy** to reach 30-page minimum: title page, dedication page, "about the author" (child), activity pages, coloring pages
3. **Prioritize 39,900 KRW tier** as the default/recommended option (significantly better margins)
4. **Build gift flow UX** -- the majority of purchases will be gifts. Enable easy sharing, gift wrapping options, and gift messages
5. **Target 돌잔치 (first birthday)** and **어린이날 (Children's Day, May 5)** as initial marketing moments
6. **Consider Lulu as backup** for markets where Gelato doesn't produce locally

---

## 7. Competitor Pricing Summary Table (USD, Hardcover)

| Service | Country | Hardcover Price | Pages | AI Type | Print Status |
|---------|---------|-----------------|-------|---------|--------------|
| **story.dodam.life (target)** | **Korea** | **$21-28** | **20-30** | **Photo-to-character** | **Planned** |
| Storique | Switzerland | $67 | 26-40 | Custom AI model | Active |
| Custom Heroes | US | $49-59 | 12-20 | Photo-to-character | Active |
| Imagitime | US | $54.99 | varies | AI personalization | Active |
| Make A Book | US | $59.95 | varies | AI personalization | Active |
| Wonderbly | UK | $20-39.99 | varies | Template (non-AI) | Active (now PRH) |
| Hooray Heroes | Slovenia | $39 | varies | Template (non-AI) | Active |
| Magical Children's Book | US | $34.99 | 24 | AI from photos | Active |
| Childbook.ai | US | $29.99 | varies | AI generation | Active |
| Lullaby.ink | Australia | $29.99 | varies | Photo-to-cartoon | Active |
| Magic Story | US | $24.99 | varies | Pixar-quality AI | Active |
| ToonyStory | US | From $29.99 | varies | AI generation | Active |
| LoveToRead.ai | US | $24.99 | varies | AI-powered | Active |
| MakeMyBook | EU | From ~$9 | varies | AI generation | Active |

**story.dodam.life would be the most affordable hardcover option in the market, while being the ONLY Korean-language service.**

---

*Research compiled 2026-04-08. All prices and market data subject to change. Currency conversions at approximate rates (1 USD ≈ 1,400 KRW, 1 CHF ≈ 1.13 USD).*
