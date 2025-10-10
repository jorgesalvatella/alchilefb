'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2 } from 'lucide-react';

const cartItems = [
  { id: 1, name: 'Tacos al Pastor', price: 3.50, quantity: 2, imageId: 'taco-al-pastor' },
  { id: 2, name: 'Burrito de Carne Asada', price: 12.99, quantity: 1, imageId: 'burrito-asada' },
  { id: 3, name: 'Horchata Clásica', price: 4.00, quantity: 2, imageId: 'horchata' },
];

const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
const tax = subtotal * 0.08;
const total = subtotal + tax;

export default function CartPage() {
  return (
    <div className="relative min-h-screen bg-black text-white pt-32">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute top-20 left-10 w-72 h-72 bg-chile-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

      <div className="relative container mx-auto px-4 pb-12 md:pb-20">
        <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-black text-white mb-3">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Tu Carrito
                </span>
            </h1>
        </div>
      
      {cartItems.length === 0 ? (
        <div className="text-center">
            <p className="text-xl text-white/60 mb-4">Tu carrito está vacío.</p>
            <Button asChild className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white hover:scale-105 transition-transform duration-300">
                <Link href="/menu">Comenzar un Pedido</Link>
            </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2 space-y-4">
            {cartItems.map((item) => {
                const image = PlaceHolderImages.find((img) => img.id === item.imageId);
                return (
                <div key={item.id} className="flex items-center p-4 bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl">
                    <div className="relative h-24 w-24 rounded-lg overflow-hidden mr-4">
                    {image && (
                        <Image
                        src={image.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        data-ai-hint={image.imageHint}
                        />
                    )}
                    </div>
                    <div className="flex-grow">
                    <h3 className="font-headline text-xl text-white">{item.name}</h3>
                    <p className="text-white/60 text-sm">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2 mx-4">
                        <Button variant="outline" size="icon" className="h-8 w-8 bg-white/5 border-white/20 text-white hover:bg-white/10"><Minus className="h-4 w-4" /></Button>
                        <span className="font-bold text-lg w-5 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8 bg-white/5 border-white/20 text-white hover:bg-white/10"><Plus className="h-4 w-4" /></Button>
                    </div>
                    <p className="font-bold text-lg w-20 text-right">${(item.price * item.quantity).toFixed(2)}</p>
                    <Button variant="ghost" size="icon" className="ml-2 text-white/50 hover:text-red-500 transition-colors">
                        <Trash2 className="h-5 w-5" />
                    </Button>
                </div>
                );
            })}
            </div>

            <div className="sticky top-32 bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6">
                <h2 className="font-headline text-3xl text-white mb-4">Resumen</h2>
                <div className="space-y-4">
                    <div className="flex justify-between text-white/80">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white/80">
                        <span>Impuestos y Tarifas</span>
                        <span>${tax.toFixed(2)}</span>
                    </div>
                    <Separator className="bg-white/20" />
                    <div className="flex justify-between font-bold text-xl text-white">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                </div>
                <Button asChild size="lg" className="w-full font-headline text-lg mt-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white hover:scale-105 transition-transform duration-300">
                    <Link href="/checkout">Proceder al Pago</Link>
                </Button>
            </div>
        </div>
      )}
    </div>
    </div>
  );
}