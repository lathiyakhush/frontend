import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Homeslider from '../../components/Homeslider'
import Adsbennerslider from '../../components/Adsbannerslider'
import PopularProducts from '../../components/product/popularproduct'
import LatestProducts from '../../components/Latestproduct/latestproduct'
import FeaturedSlider from '../../components/FeaturedSlider/FeaturedSlider'
import AdBannerSection from '../../components/aBanner/Banner'
import { fetchCategories } from '../../api/catalog'


// Main Home component
const Home = () => {
  const [apiCategories, setApiCategories] = useState([])
  const categoryStripRef = useRef(null)
  const [canScrollCategories, setCanScrollCategories] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const data = await fetchCategories()
        if (cancelled) return
        setApiCategories(Array.isArray(data) ? data : [])
      } catch (_e) {
        if (!cancelled) setApiCategories([])
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const el = categoryStripRef.current
    if (!el) return

    const compute = () => {
      try {
        setCanScrollCategories(el.scrollWidth > el.clientWidth + 2)
      } catch (_e) {
        setCanScrollCategories(false)
      }
    }

    compute()
    window.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('resize', compute)
    }
  }, [apiCategories.length])

  const categories = useMemo(() => {
    const list = Array.isArray(apiCategories) ? apiCategories : []

    const COLORS = [
      { color: 'border-blue-600', bg: 'bg-blue-50' },
      { color: 'border-purple-600', bg: 'bg-purple-50' },
      { color: 'border-pink-600', bg: 'bg-pink-50' },
      { color: 'border-green-600', bg: 'bg-green-50' },
      { color: 'border-orange-600', bg: 'bg-orange-50' },
      { color: 'border-red-600', bg: 'bg-red-50' },
    ]

    return list
      .filter((c) => c && (c.active === undefined || Boolean(c.active)))
      .filter((c) => !c.parentId)
      .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
      .map((c, index) => {
        const rawName = String(c?.name || c?.title || '').trim()
        const id = String(c?.id || c?._id || rawName)
        const colorPair = COLORS[index % COLORS.length]

        return {
          name: rawName || id,
          icon: null,
          img: String(c?.imageUrl || '').trim(),
          color: colorPair.color,
          bg: colorPair.bg,
          to: id ? `/ProductListing?category=${encodeURIComponent(id)}` : '/ProductListing',
        }
      })
  }, [apiCategories])

  return (
    <div className="home-page bg-[#f7f7f7] mt-24 lg:mt-40">
      {/* Categories Section - Always Visible */}
      <section className="categories-section bg-white mt-24 lg:mt-40 pt-4 pb-4 sm:pt-5 sm:pb-5 border-b">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="relative">
            <button
              type="button"
              aria-label="Scroll categories left"
              onClick={() => categoryStripRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              className={`${canScrollCategories ? 'hidden sm:flex' : 'hidden'} absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white shadow border border-gray-200 hover:bg-gray-50`}
            >
              <span className="text-xl leading-none">‹</span>
            </button>

            <button
              type="button"
              aria-label="Scroll categories right"
              onClick={() => categoryStripRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              className={`${canScrollCategories ? 'hidden sm:flex' : 'hidden'} absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white shadow border border-gray-200 hover:bg-gray-50`}
            >
              <span className="text-xl leading-none">›</span>
            </button>

            <div
              ref={categoryStripRef}
              className="flex w-full items-start justify-center gap-3 overflow-x-auto whitespace-nowrap scrollbar-hide px-2 sm:px-0"
              style={{ scrollSnapType: 'x mandatory' }}
            >
            {categories.map((c) => {
              const Icon = c.icon
              return (
                <Link
                  key={c.name}
                  to={c.to}
                  className="flex flex-col items-center min-w-[70px] sm:min-w-[80px]"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 ${c.color} ${c.bg} flex items-center justify-center overflow-hidden bg-gray-50 shrink-0`}>
                    {c.img ? (
                      <img
                        src={c.img}
                        alt={c.name}
                        className="w-full h-full object-cover"
                        style={{ aspectRatio: '1/1' }}
                        loading="eager"
                      />
                    ) : Icon ? (
                      <Icon className="text-gray-800 text-lg sm:text-xl" />
                    ) : (
                      <div className="text-gray-400 text-lg sm:text-xl">📁</div>
                    )}
                  </div>
                  <div className="mt-2 text-[12px] sm:text-sm font-semibold text-gray-900 text-center">
                    {c.name}
                  </div>
                </Link>
              )
            })}
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section - Slider Only */}
      <section className="hero-section pt-1">
        <Homeslider />
        <div data-scroll-top-trigger="1" />
        {/* <Homecatslider /> */}
      </section>

      {/* Products Section */}
      <section className="products-section">
        <PopularProducts hideAddToCart />
        {/* 👇 AdBanner added below PopularProducts */}
        <div className="mt-2">
          <AdBannerSection />
        </div>
        <LatestProducts title="Latest Products" hideAddToCart />
        <FeaturedSlider hideAddToCart />
      </section>

      {/* Promotions Section */}
      <section className="promotions-section py-4 sm:py-10">
        <div className="container mx-auto px-3 sm:px-4">
          {/* <FreeShippingBanner /> */}
          <Adsbennerslider items={4} />
        </div>
      </section>

      {/* Content Sections */}
      <section className="content-sections">
      </section>
    </div>
  )
}

export default Home
