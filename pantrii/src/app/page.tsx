import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

function Hero() {
  return (
    <section className="relative pt-28 pb-16 hero-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 dark:text-white">
              Your kitchen, organized.
            </h1>
            <p className="mt-4 text-lg text-stone-700 dark:text-neutral-300">
              Pantrii brings meal planning, recipes, grocery lists, and pantry tracking together with a modern kitchen feel.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#cta" className="inline-flex items-center justify-center rounded-full bg-pantrii-600 text-white px-5 py-3 text-sm font-semibold shadow-sm hover:opacity-95">
                Start organizing
              </a>
              <a href="#features" className="inline-flex items-center justify-center rounded-full border border-stone-300/80 dark:border-white/15 px-5 py-3 text-sm font-semibold text-stone-800 dark:text-white hover:bg-stone-50/60 dark:hover:bg-white/5">
                Explore features
              </a>
            </div>
            <div className="mt-8 flex items-center gap-4 text-sm text-stone-600 dark:text-neutral-400">
              <span>Smart meal plans</span>
              <span aria-hidden>•</span>
              <span>Auto-generated grocery lists</span>
              <span aria-hidden>•</span>
              <span>Recipe import</span>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-black/5 dark:border-white/10 shadow-xl bg-[--color-cream]">
              <div className="absolute inset-0 grid grid-cols-3 gap-2 p-4">
                <div className="rounded-xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 p-4">
                  <p className="text-xs font-medium text-stone-500 dark:text-neutral-300">This Week</p>
                  <div className="mt-2 h-2 w-20 rounded bg-pantrii-200"></div>
                  <div className="mt-2 h-2 w-24 rounded bg-pantrii-300"></div>
                  <div className="mt-2 h-2 w-16 rounded bg-pantrii-100"></div>
                </div>
                <div className="rounded-xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 p-4">
                  <p className="text-xs font-medium text-stone-500 dark:text-neutral-300">Grocery</p>
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="h-2 w-24 rounded bg-pantrii-200"></div>
                    <div className="h-2 w-20 rounded bg-pantrii-300"></div>
                    <div className="h-2 w-16 rounded bg-pantrii-100"></div>
                  </div>
                </div>
                <div className="rounded-xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 p-4">
                  <p className="text-xs font-medium text-stone-500 dark:text-neutral-300">Pantry</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="h-6 rounded bg-pantrii-100"></div>
                    <div className="h-6 rounded bg-pantrii-200"></div>
                    <div className="h-6 rounded bg-pantrii-300"></div>
                    <div className="h-6 rounded bg-pantrii-200"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      title: "Meal prep made easy",
      desc: "Plan a week of meals and automatically generate smart grocery lists.",
      icon: "/feature-meal-prep.svg",
    },
    {
      title: "Save and import recipes",
      desc: "Clip from the web or create your own with nutrition and tags.",
      icon: "/feature-recipes.svg",
    },
    {
      title: "Pantry tracking",
      desc: "Know what you have on hand and avoid waste.",
      icon: "/feature-grocery.svg",
    },
  ];

  return (
    <section id="features" className="py-20 bg-[--color-cream] dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-white">
            Everything for your kitchen flow
          </h2>
          <p className="mt-4 text-stone-700 dark:text-neutral-300">
            Pantrii helps you plan, shop, and cook better with tools that work together.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm"
            >
              <Image src={item.icon} alt="" width={40} height={40} />
              <h3 className="mt-4 text-lg font-semibold text-stone-900 dark:text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-stone-600 dark:text-neutral-300">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { title: "Plan", desc: "Pick meals for the week." },
    { title: "Shop", desc: "Get an optimized grocery list." },
    { title: "Cook", desc: "Follow step‑by‑step recipes." },
  ];
  return (
    <section id="how" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
            How it works
          </h2>
        </div>
        <ol className="mt-12 grid gap-6 sm:grid-cols-3">
          {steps.map((step, idx) => (
            <li key={step.title} className="rounded-2xl border border-black/5 dark:border-white/10 p-6 bg-white dark:bg-white/5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pantrii-600 text-white font-semibold">
                {idx + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-stone-900 dark:text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-stone-600 dark:text-neutral-300">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="cta" className="py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-black/5 dark:border-white/10 p-10 sm:p-12 bg-gradient-to-r from-pantrii-600 to-pantrii-500">
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-bold text-white">Be first to try Pantrii</h3>
            <p className="mt-2 text-white/90">Join the waitlist and get early access.</p>
            <form className="mt-6 flex flex-col sm:flex-row gap-3" action="#" method="post">
              <input
                type="email"
                required
                placeholder="you@kitchen.com"
                className="min-w-0 flex-1 rounded-full border-none bg-white/95 px-5 py-3 text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-white/60"
              />
              <button className="inline-flex items-center justify-center rounded-full bg-stone-900 text-white px-6 py-3 font-semibold hover:bg-stone-800">
                Join waitlist
              </button>
            </form>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/5 dark:border-white/10 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo-pantrii.svg" alt="Pantrii" width={110} height={24} />
            <span className="text-sm text-stone-600 dark:text-neutral-400">© {new Date().getFullYear()} Pantrii</span>
          </div>
          <div className="text-sm text-stone-600 dark:text-neutral-400">
            <a className="hover:text-stone-900 dark:hover:text-white" href="#">Privacy</a>
            <span className="mx-2">•</span>
            <a className="hover:text-stone-900 dark:hover:text-white" href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="font-sans min-h-screen bg-[--color-cream] dark:bg-black text-stone-900 dark:text-white">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
