
import { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Términos y Condiciones - Al Chile MeatBalls',
  description: 'Consulta los términos y condiciones de uso de nuestro servicio.',
};

export default function TermsAndConditionsPage() {
  return (
    <main className="container mx-auto px-4 py-12 pt-24 sm:pt-32">
      <div className="text-center mb-10">
        <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Términos y Condiciones
          </span>
        </h1>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardContent className="space-y-6 text-muted-foreground pt-8">
          <p>
            <strong>Fecha de última actualización:</strong> 14 de octubre de 2025
          </p>

          <p>
            Bienvenido a Al Chile MeatBalls. Estos términos y condiciones describen las reglas y regulaciones para el uso del sitio web de Al Chile MeatBalls, ubicado en <a href="https://alchilemeatballs.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://alchilemeatballs.com</a>.
          </p>
          <p>
            Al acceder a este sitio web, asumimos que aceptas estos términos y condiciones. No continúes usando Al Chile MeatBalls si no estás de acuerdo con todos los términos y condiciones establecidos en esta página.
          </p>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">1. Identificación</h2>
            <p>
              El presente sitio web es operado por <strong>Jorge Humberto Espinosa Salvatella</strong> (en adelante "Al Chile MeatBalls"), persona física con actividad empresarial, en cumplimiento con la Ley Federal de Protección al Consumidor.
            </p>
            <p>
              <strong>Contacto:</strong>
              <br />
              Correo electrónico: <a href="mailto:chiel@alchilemeatballs.com" className="text-primary hover:underline">chiel@alchilemeatballs.com</a>
              <br />
              Teléfono: 984 186 3626
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">2. Uso del Sitio Web</h2>
            <p>
              El usuario se compromete a utilizar el sitio web, sus contenidos y servicios de conformidad con la ley, la moral, el orden público y los presentes Términos y Condiciones. Asimismo, se obliga a no utilizar el sitio con fines o efectos ilícitos o contrarios al contenido de los presentes Términos y Condiciones.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">3. Proceso de Compra</h2>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li><strong>Selección de Productos:</strong> El usuario podrá navegar por el catálogo y añadir los productos deseados al carrito de compras.</li>
              <li><strong>Precios:</strong> Todos los precios de los productos que se indican a través del sitio web incluyen IVA y los demás impuestos que pudieran corresponderles.</li>
              <li><strong>Pago:</strong> El usuario deberá realizar el pago de su pedido a través de los métodos de pago disponibles en el sitio. La transacción estará sujeta a la verificación y aprobación del proveedor del servicio de pago.</li>
              <li><strong>Confirmación:</strong> Una vez completado el pago, el usuario recibirá un correo electrónico de confirmación con los detalles de su pedido.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">4. Envíos y Entregas</h2>
            <p>
              Las políticas de envío, costos, tiempos de entrega y zonas de cobertura se especificarán durante el proceso de compra y podrán variar sin previo aviso. Es responsabilidad del usuario proporcionar una dirección de entrega correcta y completa.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">5. Cancelaciones y Devoluciones</h2>
            <p>
              Debido a la naturaleza perecedera de nuestros productos (alimentos), no se aceptan devoluciones. Si el producto llega en mal estado o no corresponde con lo solicitado, el cliente deberá contactarnos dentro de las 2 horas siguientes a la recepción del pedido a través de nuestros canales de contacto para evaluar el caso y ofrecer una posible solución, como un reembolso o el reenvío del producto.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">6. Propiedad Intelectual</h2>
            <p>
              Todos los derechos de propiedad intelectual del contenido de este sitio web, incluyendo, sin limitación, imágenes, textos, logotipos y diseños, son propiedad de Al Chile MeatBalls.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">7. Modificaciones a los Términos y Condiciones</h2>
            <p>
              Al Chile MeatBalls se reserva el derecho de modificar en cualquier momento los presentes Términos y Condiciones. Cualquier cambio será publicado en esta página y se notificará la fecha de la última actualización.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">8. Ley Aplicable y Jurisdicción</h2>
            <p>
              Para la interpretación y cumplimiento de los presentes términos y condiciones, las partes se someten a la jurisdicción de los tribunales de la Ciudad de [Tu Ciudad], renunciando expresamente a cualquier otro fuero que pudiere corresponderles por razón de sus domicilios presentes o futuros. La Procuraduría Federal del Consumidor (PROFECO) es competente en la vía administrativa para resolver cualquier controversia que se suscite sobre la interpretación o cumplimiento del presente contrato.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
