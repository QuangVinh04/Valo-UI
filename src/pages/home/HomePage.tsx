import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/common/Hero';
import '@/styles/pages/home.css';

function HomePage() {
  return (
    <div className="home-shell">
      <Header />
      <main className="home-main">
        <Hero />
      </main>
      <Footer />
    </div>
  );
}

export default HomePage;
