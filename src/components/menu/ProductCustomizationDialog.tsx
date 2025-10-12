'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCart } from '@/context/cart-context';
import { SaleProduct } from '@/lib/types'; // Assuming types are defined here
import { toast } from '@/hooks/use-toast';
import { Plus, Minus } from 'lucide-react';

interface ProductCustomizationDialogProps {
  product: SaleProduct | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ProductCustomizationDialog({ product, isOpen, onOpenChange }: ProductCustomizationDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [currentPrice, setCurrentPrice] = useState(product?.price || 0);
  const { addItem } = useCart();

  useEffect(() => {
    if (product) {
      let total = product.price;
      
      // Add price of selected extras
      selectedExtras.forEach(extraName => {
        const extra = product.ingredientesExtra?.find(e => e.nombre === extraName);
        if (extra) {
          total += extra.precio;
        }
      });

      setCurrentPrice(total * quantity);
    }
  }, [product, selectedExtras, quantity]);

  useEffect(() => {
    // Reset state when a new product is passed in
    if (product) {
      setQuantity(1);
      setSelectedExtras([]);
      setRemovedIngredients([]);
      setCurrentPrice(product.price);
    }
  }, [product]);

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      imageUrl: product.imageUrl,
      customizations: {
        added: selectedExtras,
        removed: removedIngredients,
      },
    });

    toast({
      title: '¡Añadido al carrito!',
      description: `${quantity} x ${product.name} se ha añadido a tu pedido.`,
    });

    onOpenChange(false);
  };

  const handleExtraChange = (extraName: string, checked: boolean) => {
    setSelectedExtras(prev => 
      checked ? [...prev, extraName] : prev.filter(name => name !== extraName)
    );
  };

  const handleIngredientChange = (ingredientName: string, checked: boolean) => {
    // If it's checked, it means it's NOT removed.
    setRemovedIngredients(prev => 
      !checked ? [...prev, ingredientName] : prev.filter(name => name !== ingredientName)
    );
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-orange-400">{product.name}</DialogTitle>
          <DialogDescription>{product.description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Base Ingredients */}
          {product.ingredientesBase && product.ingredientesBase.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-white/80">Ingredientes Incluidos:</h4>
              {product.ingredientesBase.map(ingredient => (
                <div key={ingredient} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`base-${ingredient}`} 
                    defaultChecked 
                    onCheckedChange={(checked) => handleIngredientChange(ingredient, !!checked)}
                    className="border-orange-400"
                  />
                  <Label htmlFor={`base-${ingredient}`} className="cursor-pointer">{ingredient}</Label>
                </div>
              ))}
            </div>
          )}

          {/* Extra Ingredients */}
          {product.ingredientesExtra && product.ingredientesExtra.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-white/80">Añade un Extra:</h4>
              {product.ingredientesExtra.map(extra => (
                <div key={extra.nombre} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id={`extra-${extra.nombre}`}
                      onCheckedChange={(checked) => handleExtraChange(extra.nombre, !!checked)}
                      className="border-orange-400"
                    />
                    <Label htmlFor={`extra-${extra.nombre}`} className="cursor-pointer">{extra.nombre}</Label>
                  </div>
                  <span className="text-sm text-yellow-400">+${extra.precio.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Disminuir cantidad"><Minus className="h-4 w-4"/></Button>
            <span className="font-bold text-lg w-8 text-center">{quantity}</span>
            <Button variant="outline" size="icon" onClick={() => setQuantity(q => q + 1)} aria-label="Aumentar cantidad"><Plus className="h-4 w-4"/></Button>
          </div>
          <Button onClick={handleAddToCart} className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
            Añadir por ${currentPrice.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
