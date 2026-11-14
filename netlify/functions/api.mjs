import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const S = () => getStore({ name: "rahmah", consistency: "strong" });
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const E = (m, s = 400) => J({ error: m }, s);
const str = (v, n) => String(v || "").trim().slice(0, n);
const price = (p) => Math.round(p.regular * (100 - (p.disc || 0)) / 100);

const sp = (i, name, cat, regular, disc, sizes, colors) => ({
  id: "s" + i, name, cat, regular, disc, sizes, colors, stock: 20, images: [], sample: true,
  desc: "এটি একটি নমুনা পণ্য। অ্যাডমিন প্যানেল থেকে মুছে আপনার আসল বোরকা যোগ করুন।",
});
const DEF = () => ({
  settings: { bkash: "01727948272", nagad: "01727948272", whatsapp: "8801737588395", dhaka: 80, outside: 130 },
  categories: [
    { id: "set", name: "মুসলিমা সেট বোরকা", icon: "🧕" },
    { id: "premium", name: "প্রিমিয়াম বোরকা", icon: "👑" },
    { id: "simple", name: "সিম্পল বোরকা", icon: "🖤" },
    { id: "hijab", name: "হিজাব", icon: "🧣" },
    { id: "niqab", name: "নিকাব", icon: "🎭" },
    { id: "new", name: "নতুন কালেকশন", icon: "✨" },
  ],
  products: [
    sp(1, "মুসলিমা সেট বোরকা – কালো", "set", 2200, 15, ["৫২", "৫৪", "৫৬"], ["কালো", "মেরুন"]),
    sp(2, "প্রিমিয়াম এমব্রয়ডারি বোরকা", "premium", 3200, 20, ["৫২", "৫৪", "৫৬", "৫৮"], ["কালো", "প্লাম"]),
    sp(3, "সিম্পল ডেইলি বোরকা", "simple", 1500, 10, ["৫০", "৫২", "৫৪"], ["কালো", "নেভি"]),
    sp(4, "জর্জেট হিজাব", "hijab", 450, 0, ["ফ্রি সাইজ"], ["ডাস্টি রোজ", "কালো", "মেরুন"]),
    sp(5, "ফ্লাই নিকাব", "niqab", 350, 0, ["ফ্রি সাইজ"], ["কালো"]),
    sp(6, "নতুন খিমার সেট", "new", 2800, 12, ["ফ্রি সাইজ"], ["ডাস্টি রোজ", "প্লাম"]),
  ],
});
const load = async () => (await S().get("store", { type: "json" })) || DEF();

const secret = () => crypto.createHash("sha256").update("rf:" + process.env.ADMIN_PASSWORD).digest();
const sign = (e) => { const b = String(e); return b + "." + crypto.createHmac("sha256", secret()).update(b).digest("hex"); };
const authed = (req) => {
  const t = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const [e] = t.split(".");
  if (!e || +e < Date.now()) return false;
  const x = sign(e);
  return x.length === t.length && crypto.timingSafeEqual(Buffer.from(x), Buffer.from(t));
};

export default async (req) => {
  const p = new URL(req.url).pathname.replace(/^\/api\/?/, ""), m = req.method;
  try {
    if (p === "store" && m === "GET") return J(await load());

    if (p.startsWith("img/")) {
      const r = await S().getWithMetadata("img/" + p.slice(4).replace(/[^\w-]/g, ""), { type: "arrayBuffer" });
      if (!r) return new Response("Not found", { status: 404 });
      return new Response(r.data, { headers: { "content-type": r.metadata?.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
    }

    if (p === "order" && m === "POST") {
      const b = await req.json(), d = await load();
      const name = str(b.name, 80), address = str(b.address, 300), district = str(b.district, 40), upazila = str(b.upazila, 60);
      const phone = String(b.phone || "").replace(/\D/g, "").replace(/^880/, "0");
      if (!name || !/^01\d{9}$/.test(phone) || !address || !district || !upazila) return E("অনুগ্রহ করে সব তথ্য সঠিকভাবে দিন");
      const pay = ["bkash", "nagad", "cod"].includes(b.pay) ? b.pay : "cod";
      const trx = str(b.trx, 40), sender = str(b.sender, 20);
      if (pay !== "cod" && !trx) return E("Transaction ID দিন");
      if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30) return E("কার্ট খালি");
      let sub = 0; const items = [];
      for (const it of b.items) {
        const pr = d.products.find((x) => x.id === it.id);
        const qty = Math.max(1, Math.min(99, parseInt(it.qty) || 1));
        if (!pr) return E("একটি পণ্য আর পাওয়া যাচ্ছে না, কার্ট আপডেট করুন");
        if (pr.stock < qty) return E(`"${pr.name}" এর স্টক আছে মাত্র ${pr.stock}টি`);
        pr.stock -= qty;
        const unit = price(pr); sub += unit * qty;
        items.push({ id: pr.id, name: pr.name, size: str(it.size, 30), color: str(it.color, 30), qty, price: unit });
      }
      const delivery = district === "ঢাকা" ? +d.settings.dhaka : +d.settings.outside;
      const id = "RF" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
      const order = { id, created: Date.now(), status: "নতুন অর্ডার", name, phone, address, district, upazila, pay, trx, sender, items, sub, delivery, total: sub + delivery };
      await S().setJSON("orders/" + id, order);
      await S().setJSON("store", d);
      return J({ id, total: order.total });
    }

    if (p === "track" && m === "GET") {
      const ids = (new URL(req.url).searchParams.get("ids") || "").split(",").filter((x) => /^\w+$/.test(x)).slice(0, 20);
      const r = await Promise.all(ids.map((i) => S().get("orders/" + i, { type: "json" })));
      return J(r.filter(Boolean).map((o) => ({ id: o.id, status: o.status, total: o.total })));
    }

    if (p === "login" && m === "POST") {
      const pw = process.env.ADMIN_PASSWORD;
      if (!pw) return E("Netlify-এ ADMIN_PASSWORD সেট করা হয়নি", 500);
      const b = await req.json();
      const h = (x) => crypto.createHash("sha256").update(String(x)).digest();
      if (!crypto.timingSafeEqual(h(b.password), h(pw))) { await new Promise((r) => setTimeout(r, 1200)); return E("পাসওয়ার্ড ভুল", 401); }
      return J({ token: sign(Date.now() + 7 * 864e5) });
    }

    if (p.startsWith("admin/")) {
      if (!process.env.ADMIN_PASSWORD) return E("ADMIN_PASSWORD সেট করা হয়নি", 500);
      if (!authed(req)) return E("অনুমতি নেই, আবার লগইন করুন", 401);

      if (p === "admin/store" && m === "POST") {
        const b = await req.json();
        if (!Array.isArray(b.products) || !Array.isArray(b.categories) || typeof b.settings !== "object") return E("ভুল ডেটা");
        const arr = (v) => (Array.isArray(v) ? v.map((x) => str(x, 60)).filter(Boolean) : []);
        const d = {
          settings: b.settings, categories: b.categories,
          products: b.products.map((x) => ({ ...x, regular: +x.regular || 0, disc: Math.min(90, Math.max(0, +x.disc || 0)), stock: Math.max(0, parseInt(x.stock) || 0), sizes: arr(x.sizes), colors: arr(x.colors), images: arr(x.images) })),
        };
        await S().setJSON("store", d);
        return J({ ok: true });
      }

      if (p === "admin/upload" && m === "POST") {
        const type = req.headers.get("content-type") || "";
        const buf = await req.arrayBuffer();
        if (!/^image\//.test(type) || !buf.byteLength || buf.byteLength > 5e6) return E("ছবি সঠিক নয় বা অনেক বড়");
        const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
        await S().set("img/" + id, buf, { metadata: { type } });
        return J({ url: "/api/img/" + id });
      }

      if (p === "admin/orders" && m === "GET") {
        const { blobs } = await S().list({ prefix: "orders/" });
        const r = await Promise.all(blobs.map((b) => S().get(b.key, { type: "json" })));
        return J(r.filter(Boolean).sort((a, b) => b.created - a.created));
      }

      if (p === "admin/order" && m === "POST") {
        const b = await req.json(), key = "orders/" + String(b.id).replace(/\W/g, "");
        if (b.del) { await S().delete(key); return J({ ok: true }); }
        const o = await S().get(key, { type: "json" });
        if (!o) return E("অর্ডার পাওয়া যায়নি", 404);
        o.status = str(b.status, 30);
        await S().setJSON(key, o);
        return J({ ok: true });
      }
    }
    return E("Not found", 404);
  } catch (e) {
    return E("সার্ভারে সমস্যা: " + e.message, 500);
  }
};

export const config = { path: "/api/*" };
