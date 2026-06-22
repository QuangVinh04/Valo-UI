import Header from '@/layouts/Header';
import Footer from '@/layouts/Footer';
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
