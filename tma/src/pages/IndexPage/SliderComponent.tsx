import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface SlideData {
  title: string;
  description: string;
  glowColor: string;
  accentColor: string;
}

const FuturisticSlider: React.FC = () => {
  const slides: SlideData[] = [
    {
      title: "PROXY",
      description: "Smart contract blocks DNS recording of changes",
      glowColor: "rgba(117, 94, 215, 0.6)",
      accentColor: "#755ed7"
    },
    {
      title: "TOP Auctions",
      description: "Discover trending collections",
      glowColor: "rgba(226, 248, 164, 0.6)",
      accentColor: "#e2f8a4"
    },
    {
      title: "Freedom for utility",
      description: "Comprehensive functionality for all subdomain types",
      glowColor: "rgba(170, 225, 254, 0.6)",
      accentColor: "#aae1fe"
    },
    {
      title: "Buy NFT for 5% ownership",
      description: "1000 ton grants access to 5 subdomain zones",
      glowColor: "rgba(243, 151, 243, 0.6)",
      accentColor: "#f397f3"
    }
  ];

  return (
    <div className="futuristic-slider-wrapper" style={{ width: '375px', height: '200px', margin: '0 auto', padding: '10px 0px' }}>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={10}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <div 
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Периферийный градиент подсветка */}
              <div 
                style={{
                  position: 'absolute',
                  width: '200%',
                  height: '200%',
                  background: `radial-gradient(ellipse at 50% 50%, ${slide.glowColor} 0%, transparent 70%)`,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) perspective(1000px) rotateX(25deg)',
                  zIndex: 1,
                  filter: 'blur(40px)',
                  pointerEvents: 'none'
                }}
              />

              {/* Центральное цветовое пятно с наклоном */}
              <div 
                style={{
                  position: 'absolute',
                  width: '150px',
                  height: '150px',
                  background: `radial-gradient(circle, ${slide.glowColor} 0%, transparent 100%)`,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) perspective(1200px) rotateX(35deg) rotateZ(-15deg)',
                  zIndex: 2,
                  filter: 'blur(50px)',
                  opacity: 0.7,
                  pointerEvents: 'none'
                }}
              />

              {/* Содержимое с высоким z-index */}
              <div style={{ position: 'relative', zIndex: 10 }}>
                <h3 
                  style={{ 
                    margin: '0 0 12px 0',
                    fontSize: '32px',
                    fontWeight: '200',
                    letterSpacing: '3px',
                    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                    textTransform: 'uppercase',
                    background: `linear-gradient(135deg, #ffffff 0%, ${slide.accentColor} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: `0 0 30px ${slide.glowColor}, 0 0 60px ${slide.glowColor}`,
                    filter: 'drop-shadow(0 0 20px ' + slide.glowColor + ')',
                    fontStyle: 'italic'
                  }}
                >
                  {slide.title}
                </h3>
                <p 
                  style={{ 
                    margin: '0',
                    fontSize: '13px',
                    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
                    fontWeight: '300',
                    letterSpacing: '0.5px',
                    width: '320px',
                    color: '#e0e0e0',
                    lineHeight: '1.5',
                    textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
                    filter: 'drop-shadow(0 0 8px ' + slide.glowColor + ')'
                  }}
                >
                  {slide.description}
                </p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <style>{`
        .futuristic-slider-wrapper .swiper-button-next,
        .futuristic-slider-wrapper .swiper-button-prev {
          color: #ffffff;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .futuristic-slider-wrapper .swiper-button-next:hover,
        .futuristic-slider-wrapper .swiper-button-prev:hover {
          opacity: 1;
        }

        .futuristic-slider-wrapper .swiper-pagination-bullet {
          background: rgba(255, 255, 255, 0.4);
          transition: all 0.3s;
        }

        .futuristic-slider-wrapper .swiper-pagination-bullet-active {
          background: #ffffff;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
        }
      `}</style>
    </div>
  );
};

export default FuturisticSlider;