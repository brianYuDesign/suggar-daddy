'use client'

import React from 'react'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-light via-white to-light">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">🎬 Sugar Daddy</h1>
          <div className="flex gap-4">
            <Link
              href="/explore"
              className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
            >
              Start Exploring
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold text-dark mb-6 leading-tight">
          Discover Amazing <span className="text-primary">Creators</span>
        </h2>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Support talented creators directly and get exclusive content. Find your new favorite creators today.
        </p>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-full font-bold text-lg hover:bg-red-600 transition-all hover:scale-105 active:scale-95"
        >
          🚀 Explore Now
        </Link>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h3 className="text-4xl font-bold text-dark text-center mb-16">
            Why Choose Sugar Daddy?
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '🎯',
                title: 'Discover',
                description: 'Find incredible creators across all categories',
              },
              {
                icon: '❤️',
                title: 'Support',
                description: 'Subscribe to support creators with multiple tiers',
              },
              {
                icon: '⭐',
                title: 'Engage',
                description: 'Like, comment, and share your favorite content',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-light rounded-lg p-8 text-center hover:shadow-lg transition-shadow"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h4 className="text-2xl font-bold text-dark mb-3">
                  {feature.title}
                </h4>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Creators', value: '10K+' },
              { label: 'Subscribers', value: '500K+' },
              { label: 'Content', value: '1M+' },
              { label: 'Countries', value: '50+' },
            ].map((stat, idx) => (
              <div key={idx}>
                <div className="text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-red-600 py-20 text-center text-white">
        <div className="max-w-2xl mx-auto px-4">
          <h3 className="text-4xl font-bold mb-6">Ready to Discover?</h3>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of fans supporting their favorite creators
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary rounded-full font-bold text-lg hover:bg-gray-100 transition-all hover:scale-105 active:scale-95"
          >
            Start Exploring Now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-lg font-bold mb-4">Sugar Daddy</h4>
              <p className="text-gray-400">
                Support creators directly and discover amazing content
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Platform</h5>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/explore" className="hover:text-white">Explore</Link></li>
                <li><a href="#" className="hover:text-white">For Creators</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Follow</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Twitter</a></li>
                <li><a href="#" className="hover:text-white">Instagram</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Sugar Daddy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
