import Image from 'next/image';
import Link from 'next/link';
import { BrandMark } from '@/components/brand';
import { Icon } from '@/components/icons';
import { Reveal } from '@/components/motion';
import { ServicesSection } from '@/components/services-section';
import { StoreMap } from '@/components/store-map';
import inside from '../../../public/inside.png';
import outside from '../../../public/outside.jpg';

// Pin del local recuperado del enlace de Google Maps de raymerweb.
const location = {
  latitude: -17.3902137,
  longitude: -66.1595044,
  maps: 'https://maps.app.goo.gl/jcVJNeUoKU4yUeJv7',
};

export default function About() {
  return <>
    <section className="page-heading"><span className="eyebrow">SOMOS CORPRAYMER S.R.L.</span><h1>Tecnología en tus manos.</h1><p>Computación, gaming y servicio técnico en Cochabamba.</p></section>
    <section className="about-intro" aria-labelledby="about-intro-title">
      <div className="about-intro-copy">
        <BrandMark className="about-brand"/>
        <h2 id="about-intro-title">Todo para tu equipo,<br/><em>en un solo lugar.</em></h2>
        <p>En Raymer encuentras laptops, equipos informáticos, componentes, repuestos, periféricos y cables para estudiar, trabajar y jugar. Te ayudamos a elegir lo que necesitas según el uso que le darás a tu equipo.</p>
        <p>También armamos PCs a medida y ofrecemos servicio técnico de reparaciones informáticas. Ya sea que busques tu primera computadora, quieras mejorar tu setup gamer o necesites reparar una laptop, puedes consultar con nuestro equipo.</p>
        <div className="about-intro-actions">
          <Link href="/productos" className="button button-primary">Explorar productos <Icon name="arrow"/></Link>
          <Link href="#servicios" className="text-link">Conocer nuestros servicios ↗</Link>
        </div>
      </div>
      <Reveal className="about-photos">
        <span className="about-photos-note"><Icon name="pin"/> UN VISTAZO A RAYMER</span>
        <figure className="store-photo store-photo-outside">
          <figcaption><span>Nuestra fachada</span><small>01 / BIENVENIDO</small></figcaption>
          <Image src={outside} alt="Fachada de la tienda Raymer con su letrero y el león multicolor" sizes="(max-width: 600px) 76vw, (max-width: 900px) 440px, 430px" placeholder="blur"/>
        </figure>
        <figure className="store-photo store-photo-inside">
          <Image src={inside} alt="Interior de Raymer con componentes, periféricos y accesorios informáticos en exhibición" sizes="(max-width: 600px) 70vw, (max-width: 900px) 400px, 390px" placeholder="blur"/>
          <figcaption><span>Dentro de Raymer</span><small>02 / TU PRÓXIMO EQUIPO</small></figcaption>
        </figure>
      </Reveal>
    </section>

    <Reveal as="section" className="about-location">
      <div className="about-section-heading">
        <span className="eyebrow">VISÍTANOS EN COCHABAMBA</span>
        <h2>Nos vemos en <em>Raymer.</em></h2>
        <p>Conoce los equipos de cerca, encuentra ese repuesto y conversemos sobre tu próxima PC.</p>
      </div>
      <div className="location-card">
        <StoreMap latitude={location.latitude} longitude={location.longitude}/>
        <div className="location-details">
          <div className="location-address"><span className="location-pin"><Icon name="pin"/></span><div><strong>Raymer · Cochabamba</strong><address>Av. Ayacucho, Calle Ecuador<br/>Edif. Lumina Center · Cochabamba, Bolivia</address></div></div>
          <a href={location.maps} className="button" target="_blank" rel="noopener noreferrer">Cómo llegar <Icon name="arrow"/></a>
        </div>
      </div>
    </Reveal>

    <section className="about-values" aria-labelledby="about-values-title">
      <div className="about-section-heading"><span className="eyebrow">EL EQUIPO DETRÁS DE TU EQUIPO</span><h2 id="about-values-title">Lo que nos mueve</h2></div>
      <div className="values">{[
        ['01','Asesoría','Te orientamos al elegir equipos y componentes compatibles con tus necesidades.'],
        ['02','Computación y gaming','Laptops, PCs, repuestos y periféricos para tu día a día o tu próximo setup.'],
        ['03','Armado a medida','Conversemos sobre el uso y presupuesto de tu próxima PC.'],
        ['04','Servicio técnico','Consulta por la revisión y reparación de computadoras y laptops.'],
      ].map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>
    <ServicesSection/>
  </>;
}
