import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Flame } from 'lucide-react';
import { menuItems } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const featuredItems = menuItems.slice(0, 3);
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-image');
  
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[80vh] w-full flex items-center justify-center text-center text-white">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <div className="relative z-10 p-4 flex flex-col items-center">
          <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl tracking-tight drop-shadow-lg">
            Artfully Spiced.
          </h1>
          <h2 className="font-headline text-5xl md:text-7xl lg:text-8xl tracking-tight text-primary drop-shadow-lg mb-6">
            Authentically Mexican.
          </h2>
          <p className="max-w-2xl text-lg md:text-xl text-foreground/90 mb-8">
            Experience the vibrant flavors of Mexico, crafted with passion and delivered with a kick. Welcome to Al Chile.
          </p>
          <Button asChild size="lg" className="font-headline text-lg">
            <Link href="/menu">
              Explore The Menu <ArrowRight className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Featured Items Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-headline text-4xl md:text-5xl text-primary mb-2">Featured Dishes</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">Handpicked favorites that capture the soul of our kitchen.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredItems.map((item) => {
              const itemImage = PlaceHolderImages.find((img) => img.id === item.image);
              return (
              <Link href={`/menu/${item.id}`} key={item.id} className="group">
                <Card className="overflow-hidden h-full transform transition-all duration-300 hover:scale-105 hover:shadow-primary/20 shadow-lg">
                  <CardHeader className="p-0">
                    <div className="relative h-64 w-full">
                       {itemImage && (
                        <Image
                          src={itemImage.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                           data-ai-hint={itemImage.imageHint}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <CardTitle className="font-headline text-2xl mb-2">{item.name}</CardTitle>
                    <p className="text-muted-foreground mb-4 line-clamp-2">{item.description}</p>
                    <div className="flex justify-between items-center">
                       <p className="text-xl font-bold text-primary">${item.price.toFixed(2)}</p>
                       <div className="flex items-center gap-1 text-sm text-amber-400">
                          <Flame size={16}/>
                          <Flame size={16}/>
                          <Flame size={16} className="text-muted-foreground/50"/>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )})}
          </div>
        </div>
      </section>
      
      {/* About Section */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
            <div>
                <h2 className="font-headline text-4xl md:text-5xl text-primary mb-4">¿Te Atreves o Prefieres?</h2>
                <p className="text-lg text-muted-foreground mb-4">"Do you dare, or do you prefer?" is our mantra. We celebrate the spectrum of spice, from the gentle warmth that comforts to the fiery kick that exhilarates. At Al Chile, every dish is an invitation to explore your own flavor frontier.</p>
                <p className="text-lg text-muted-foreground mb-8">Our AI-powered spice recommender learns your taste to suggest the perfect heat level for every order. Find your fire.</p>
                <Button asChild size="lg" variant="outline" className="font-headline text-lg border-2">
                    <Link href="/menu">
                        Find Your Flavor
                    </Link>
                </Button>
            </div>
            <div className="relative h-80 md:h-96 rounded-lg overflow-hidden shadow-2xl">
                 {PlaceHolderImages.find(img => img.id === 'chiles-art') && (
                     <Image
                        src={PlaceHolderImages.find(img => img.id === 'chiles-art')!.imageUrl}
                        alt={PlaceHolderImages.find(img => img.id === 'chiles-art')!.description}
                        fill
                        className="object-cover"
                        data-ai-hint={PlaceHolderImages.find(img => img.id === 'chiles-art')!.imageHint}
                     />
                 )}
            </div>
        </div>
      </section>
    </div>
  );
}
