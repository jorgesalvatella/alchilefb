'use client';

import { useState } from 'react';
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
import { collection, doc, setDoc, addDoc } from 'firebase/firestore';
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
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [longDescription, setLongDescription] = useState(product?.longDescription || '');
  const [price, setPrice] = useState(product?.price || 0);
  const [category, setCategory] = useState(product?.category || 'Tacos');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');

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
      // Default values for fields that are not in the form yet
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Producto' : 'Añadir Producto'}</DialogTitle>
          <DialogDescription>
            {product ? 'Edita los detalles de tu producto.' : 'Añade un nuevo producto a tu menú.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="imageUrl" className="text-right">
              Imagen
            </Label>
            <div className="col-span-3">
              <ImageUploader onUploadComplete={setImageUrl} initialImageUrl={imageUrl} />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Descripción
            </Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="longDescription" className="text-right">
              Descripción Larga
            </Label>
            <Textarea id="longDescription" value={longDescription} onChange={(e) => setLongDescription(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Precio
            </Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Categoría
            </Label>
            <Select onValueChange={setCategory} defaultValue={category}>
              <SelectTrigger className="col-span-3">
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
        <DialogFooter>
          <Button onClick={handleSubmit}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
