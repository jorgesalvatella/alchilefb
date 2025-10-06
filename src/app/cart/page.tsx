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
  { id: 2, name: 'Carne Asada Burrito', price: 12.99, quantity: 1, imageId: 'burrito-asada' },
  { id: 3, name: 'Classic Horchata', price: 4.00, quantity: 2, imageId: 'horchata' },
];

const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
const tax = subtotal * 0.08;
const total = subtotal + tax;

export default function CartPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="font-headline text-5xl md:text-6xl text-primary">Your Cart</h1>
      </div>
      
      {cartItems.length === 0 ? (
        <div className="text-center">
            <p className="text-xl text-muted-foreground mb-4">Your cart is empty.</p>
            <Button asChild>
                <Link href="/menu">Start an Order</Link>
            </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2 space-y-4">
            {cartItems.map((item) => {
                const image = PlaceHolderImages.find((img) => img.id === item.imageId);
                return (
                <Card key={item.id} className="flex items-center p-4">
                    <div className="relative h-20 w-20 rounded-md overflow-hidden mr-4">
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
                    <h3 className="font-headline text-lg">{item.name}</h3>
                    <p className="text-muted-foreground text-sm">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2 mx-4">
                        <Button variant="outline" size="icon" className="h-7 w-7"><Minus className="h-3 w-3" /></Button>
                        <span className="font-bold text-base w-5 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7"><Plus className="h-3 w-3" /></Button>
                    </div>
                    <p className="font-bold w-16 text-right">${(item.price * item.quantity).toFixed(2)}</p>
                    <Button variant="ghost" size="icon" className="ml-2 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </Card>
                );
            })}
            </div>

            <Card className="sticky top-24">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                <span className="text-muted-foreground">Taxes & Fees</span>
                <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
                </div>
            </CardContent>
            <CardFooter>
                <Button asChild size="lg" className="w-full font-headline text-lg">
                <Link href="/checkout">Proceed to Checkout</Link>
                </Button>
            </CardFooter>
            </Card>
        </div>
      )}
    </div>
  );
}
