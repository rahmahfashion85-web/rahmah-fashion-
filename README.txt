Rahmah Fashion – Netlify ডিপ্লয় গাইড
=====================================
১) এই ফোল্ডারটি GitHub-এ নতুন repository-তে আপলোড করুন (সবচেয়ে নির্ভরযোগ্য পদ্ধতি)।
২) Netlify → Add new site → Import from Git → repository সিলেক্ট করুন। Build settings নিজে থেকেই netlify.toml থেকে আসবে।
৩) Deploy করার আগে বা পরে: Site configuration → Environment variables → নতুন variable:
     Key:   ADMIN_PASSWORD
     Value: আপনার শক্ত পাসওয়ার্ড
   এরপর Deploys → Trigger deploy করুন।
৪) অ্যাডমিন প্যানেল: আপনার-সাইট/admin  (এই লিংক কাউকে দেবেন না)
৫) ডোমেইন: Domain management → Add a domain → নির্দেশনা মতো DNS সেট করুন। HTTPS অটো চালু হবে।

ডেটা ও ছবি Netlify Blobs-এ স্থায়ীভাবে জমা থাকে (আলাদা সেটআপ লাগে না)।
প্রথমে ৬টি নমুনা পণ্য দেখাবে: অ্যাডমিন → পণ্য → "সব নমুনা পণ্য মুছুন"।
