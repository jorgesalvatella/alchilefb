
import { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Política de Privacidad - Al Chile MeatBalls',
  description: 'Consulta nuestra política de privacidad para saber cómo manejamos tus datos.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="container mx-auto px-4 py-12 pt-24 sm:pt-32">
      <div className="text-center mb-10">
        <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Política de Privacidad
          </span>
        </h1>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardContent className="space-y-6 text-muted-foreground pt-8">
          <p>
            <strong>Fecha de última actualización:</strong> 14 de octubre de 2025
          </p>

          <p>
            En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (la "Ley") y su Reglamento, <strong>Al Chile MeatBalls</strong>, nombre comercial de <strong>Jorge Humberto Espinosa Salvatella</strong>, persona física con actividad empresarial, con domicilio para oír y recibir notificaciones en [Tu Domicilio Completo, Ciudad, Estado, C.P.], es el responsable del uso y protección de sus datos personales.
          </p>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">1. ¿Quién es el responsable de sus datos personales?</h2>
            <p>
              Jorge Humberto Espinosa Salvatella ("Al Chile MeatBalls") es el responsable del tratamiento de sus datos personales.
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
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">2. ¿Qué datos personales recabamos?</h2>
            <p>
              Para llevar a cabo las finalidades descritas en el presente aviso de privacidad, utilizaremos los siguientes datos personales:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>Datos de identificación: Nombre completo.</li>
              <li>Datos de contacto: Correo electrónico, número de teléfono, domicilio de entrega.</li>
              <li>Datos de facturación: Registro Federal de Contribuyentes (RFC), domicilio fiscal.</li>
              <li>Datos transaccionales: Información de pedidos, historial de compras.</li>
            </ul>
            <p>
              No recabamos datos personales considerados como sensibles según la Ley.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">3. ¿Para qué fines utilizamos sus datos personales?</h2>
            <p>
              Los datos personales que recabamos de usted, los utilizaremos para las siguientes finalidades que son necesarias para el servicio que solicita:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>Procesar, gestionar y entregar sus pedidos.</li>
              <li>Realizar el proceso de pago y la facturación correspondiente.</li>
              <li>Crear y gestionar su cuenta de usuario en nuestro sitio web.</li>
              <li>Contactarlo para dar seguimiento a sus pedidos o resolver cualquier duda.</li>
              <li>Atender solicitudes de soporte técnico.</li>
            </ul>
            <p>
              De manera adicional, podremos utilizar su información personal para las siguientes finalidades secundarias que no son necesarias para el servicio solicitado, pero que nos permiten y facilitan brindarle una mejor atención:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>Enviarle promociones, descuentos y publicidad sobre nuestros productos.</li>
              <li>Realizar encuestas de satisfacción y calidad en el servicio.</li>
            </ul>
            <p>
              En caso de que no desee que sus datos personales sean tratados para estos fines secundarios, usted puede manifestarlo desde este momento a través de nuestro correo de contacto.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">4. ¿Con quién compartimos su información personal?</h2>
            <p>
              Le informamos que sus datos personales no son compartidos con terceros, salvo por requerimiento de una autoridad competente debidamente fundado y motivado. Únicamente se compartirán los datos necesarios para la entrega de sus pedidos con nuestros proveedores de servicios de mensajería.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">5. ¿Cómo puede acceder, rectificar o cancelar sus datos personales, u oponerse a su uso (Derechos ARCO)?</h2>
            <p>
              Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso). Asimismo, es su derecho solicitar la corrección de su información personal en caso de que esté desactualizada, sea inexacta o incompleta (Rectificación); que la eliminemos de nuestros registros o bases de datos cuando considere que la misma no está siendo utilizada adecuadamente (Cancelación); así como oponerse al uso de sus datos personales para fines específicos (Oposición). Estos derechos se conocen como derechos ARCO.
            </p>
            <p>
              Para el ejercicio de cualquiera de los derechos ARCO, usted deberá presentar la solicitud respectiva a través de un correo electrónico a: <a href="mailto:chiel@alchilemeatballs.com" className="text-primary hover:underline">chiel@alchilemeatballs.com</a>.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">6. Uso de Cookies y Tecnologías de Rastreo</h2>
            <p>
              Nuestro sitio web utiliza cookies, web beacons y otras tecnologías a través de las cuales es posible monitorear su comportamiento como usuario de Internet, así como brindarle un mejor servicio y experiencia al navegar en nuestra página. Los datos personales que obtenemos de estas tecnologías de rastreo son anónimos y se utilizan para fines estadísticos.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight border-t pt-6">7. Cambios al Aviso de Privacidad</h2>
            <p>
              El presente aviso de privacidad puede sufrir modificaciones, cambios o actualizaciones derivadas de nuevos requerimientos legales; de nuestras propias necesidades por los productos o servicios que ofrecemos; de nuestras prácticas de privacidad; o por otras causas.
            </p>
            <p>
              Nos comprometemos a mantenerlo informado sobre los cambios que pueda sufrir el presente aviso de privacidad, a través de nuestro sitio web: <a href="https://alchilemeatballs.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://alchilemeatballs.com</a>.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
