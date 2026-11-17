import { Icon } from './icons';
import { Reveal } from './motion';

const servicios = [
  'Diagnóstico general de computadoras, laptops, impresoras y escáneres',
  'Mantenimiento preventivo', 'Limpieza externa e interna de dispositivos',
  'Repuestos para dispositivos', 'Restauración de componentes',
  'Cambio de pasta térmica para CPU y GPU (metal líquido y thermal pads)',
  'Recuperación de discos externos, rígidos y SSD',
  'Formateo y reinstalación del sistema operativo', 'Actualización de drivers',
  'Ensamblado de computadoras',
];

export function ServicesSection() {
  return <section className="customer-journey" id="servicios" aria-labelledby="services-title">
    <Reveal className="journey-heading"><span className="eyebrow">SERVICIO TÉCNICO</span><h2 id="services-title">Tu equipo en buenas manos.</h2><p>Revisamos computadoras, laptops, impresoras y escáneres. El diagnóstico y el costo dependen de cada equipo.</p></Reveal>
    <div className="journey-steps"><Reveal as="article"><div><span>01 /</span><Icon name="tools"/></div><h3>Servicios que ofrecemos</h3><ul>{servicios.map(servicio => <li key={servicio}>{servicio}</li>)}</ul></Reveal>
      <Reveal as="article"><div><span>02 /</span><Icon name="chip"/></div><h3>Consulta por tu equipo</h3><p>Cuéntanos qué dispositivo tienes y qué problema presenta.</p><a className="text-link" href="https://wa.me/59172768877?text=Hola%20Raymer%2C%20necesito%20servicio%20t%C3%A9cnico." target="_blank" rel="noreferrer">Contactar por WhatsApp<Icon name="arrow"/></a></Reveal></div>
  </section>;
}
