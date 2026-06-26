import React from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Solutions from './components/Solutions'
import Services from './components/Services'
import Examples from './components/Examples'
import Playground from './components/Playground'
import Components from './components/Components'
import Architecture from './components/Architecture'
import Footer from './components/Footer'

const App: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Solutions />
      <Services />
      <Examples />
      <Playground />
      <Components />
      <Architecture />
      <Footer />
    </div>
  )
}

export default App
