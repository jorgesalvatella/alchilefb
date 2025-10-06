'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestore } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import { menuCategories } from '@/lib/data';
import type { MenuItem } from '@/lib/data';
import { ImageUploader } from './image-uploader';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';


interface AddEditProductDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  product: MenuItem | null;
}

export function AddEditProductDialog({
  isOpen,
  onOpenChange,
  product,
}: AddEditProductDialogProps) {
  const firestore = useFirestore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState('Tacos');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
        if (product) {
            setName(product.name || '');
            setDescription(product.description || '');
            setLongDescription(product.longDescription || '');
            setPrice(product.price || 0);
            setCategory(product.category || 'Tacos');
            setImageUrl(product.imageUrl || '');
        } else {
            setName('');
            setDescription('');
            setLongDescription('');
            setPrice(0);
            setCategory('Tacos');
            setImageUrl('');
        }
    }
  }, [product, isOpen]);

  const handleSubmit = async () => {
    if (!firestore) return;
    const menuItemsCollection = collection(firestore, 'menu_items');

    const productData = {
      name,
      description,
      longDescription,
      price: Number(price),
      category,
      imageUrl,
      ingredients: product?.ingredients || [],
      spiceRating: product?.spiceRating || 1,
    };

    if (product) {
      const docRef = doc(menuItemsCollection, product.id);
      setDocumentNonBlocking(docRef, productData, { merge: true });
    } else {
      await addDocumentNonBlocking(menuItemsCollection, productData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Producto' : 'Añadir Producto'}</DialogTitle>
          <DialogDescription>
            {product ? 'Edita los detalles de tu producto.' : 'Añade un nuevo producto a tu menú.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <ImageUploader onUploadComplete={setImageUrl} initialImageUrl={imageUrl} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="description">Descripción Corta</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
           <div className="space-y-2">
            <Label htmlFor="longDescription">Descripción Larga</Label>
            <Textarea id="longDescription" value={longDescription} onChange={(e) => setLongDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="price">Precio</Label>
                <Input id="price" type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select onValueChange={(value) => setCategory(value as any)} defaultValue={category}>
                <SelectTrigger id="category">
                    <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                    {menuCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                        {cat}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
