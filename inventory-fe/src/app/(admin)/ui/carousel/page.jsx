import { Carousel as CarouselBootstrap, CarouselItem, Col, Row } from 'react-bootstrap';
import ComponentContainerCard from '@/components/ComponentContainerCard';
import UIExamplesList from '@/components/UIExamplesList';
import PageMetaData from '@/components/PageTitle';
import Img1 from '@/assets/images/small/img-1.jpg';
import Img10 from '@/assets/images/small/img-10.jpg';
import Img2 from '@/assets/images/small/img-2.jpg';
import Img3 from '@/assets/images/small/img-3.jpg';
import Img4 from '@/assets/images/small/img-4.jpg';
import Img5 from '@/assets/images/small/img-5.jpg';
import Img6 from '@/assets/images/small/img-6.jpg';
import Img7 from '@/assets/images/small/img-7.jpg';
import Img8 from '@/assets/images/small/img-8.jpg';
import Img9 from '@/assets/images/small/img-9.jpg';
const SlidesOnly = () => {
  return <ComponentContainerCard id="slides-only" title="Slides Only" description={<>
          Here’s a carousel with slides only. Note the presence of the <code>.d-block</code> and <code>.img-fluid</code> on carousel images to prevent
          browser default image alignment.
        </>}>
      <Row>
        <div className="d-flex justify-content-center">
          <Col lg={6}>
            <CarouselBootstrap indicators={false} controls={false}>
              <CarouselItem>
                <img src={Img2} className="d-block w-100" alt="img-2" />
              </CarouselItem>
              <CarouselItem>
                <img src={Img3} className="d-block w-100" alt="img-3" />
              </CarouselItem>
              <CarouselItem>
                <img src={Img4} className="d-block w-100" alt="img-4" />
              </CarouselItem>
            </CarouselBootstrap>
          </Col>
        </div>
      </Row>
    </ComponentContainerCard>;
};
const SlidesWithControls = () => {
  return <ComponentContainerCard id="with-controls" title="With Controls" description={<>Adding in the previous and next controls:</>}>
      <Row>
        <div className="d-flex justify-content-center">
          <Col lg={6}>
            <CarouselBootstrap indicators={false}>
              <CarouselItem>
                <img src={Img4} className="d-block w-100" alt="img-2" />
              </CarouselItem>
              <CarouselItem>
                <img src={Img2} className="d-block w-100" alt="img-3" />
              </CarouselItem>
              <CarouselItem>
                <img src={Img3} className="d-block w-100" alt="img-4" />
              </CarouselItem>
            </CarouselBootstrap>
          </Col>
        </div>
      </Row>
    </ComponentContainerCard>;
};
const SlidesWithIndicators = () => {
  return <ComponentContainerCard id="with-indicators" title="With Indicators" description={<> You can also add the indicators to the carousel, alongside the controls, too.</>}>
      <Row>
        <div className="mx-auto mb-3 d-flex justify-content-center ">
          <Col lg={6}>
            <CarouselBootstrap>
              <CarouselItem>
                <img src={Img5} className="d-block w-100" alt="img-5" />
              </CarouselItem>
              <CarouselItem>
                <img src={Img6} className="d-block w-100" alt="img-6" />
              </CarouselItem>
              <CarouselItem>
                <img src={Img7} className="d-block w-100" alt="img-7" />
              </CarouselItem>
            </CarouselBootstrap>
          </Col>
        </div>
      </Row>
    </ComponentContainerCard>;
};
const SlidesWithCaptions = () => {
  return <ComponentContainerCard id="with-captions" title="With Captions" description={<>
          Add captions to your slides easily with the <code>.carousel-caption</code> element within any <code>.carousel-item</code>. They can be
          easily hidden on smaller viewports, as shown below, with optional display utilities. We hide them initially with <code>.d-none</code> and
          bring them back on medium-sized devices with <code>.d-md-block</code>.
        </>}>
      <Row>
        <div className="d-flex justify-content-center">
          <Col lg={6}>
            <CarouselBootstrap indicators={false}>
              <CarouselItem>
                <img src={Img6} className="d-block w-100" alt="img-6" />
                <div className="carousel-caption d-none d-md-block">
                  <h5 className="text-white">First slide label</h5>
                  <p>Some representative placeholder content for the first slide.</p>
                </div>
              </CarouselItem>
              <CarouselItem>
                <img src={Img7} className="d-block w-100" alt="img-7" />
                <div className="carousel-caption d-none d-md-block">
                  <h5 className="text-white">Second slide label</h5>
                  <p>Some representative placeholder content for the second slide.</p>
                </div>
              </CarouselItem>
              <CarouselItem>
                <img src={Img5} className="d-block w-100" alt="img-5" />
                <div className="carousel-caption d-none d-md-block">
                  <h5 className="text-white">Third slide label</h5>
                  <p>Some representative placeholder content for the third slide.</p>
                </div>
              </CarouselItem>
            </CarouselBootstrap>
          </Col>
        </div>
      </Row>
    </ComponentContainerCard>;
};
const CrossFade = () => {
  return <ComponentContainerCard id="crossfade" title="Crossfade" description={<>
          {' '}
          Add <code>.carousel-fade</code> to your carousel to animate slides with a fade transition instead of a slide. Depending on your carousel
          content (e.g., text only slides), you may want to add <code>.bg-body</code> or some custom CSS to the <code>.carousel-item</code>s for
          proper crossfading.
        </>}>
      <Row>
        <div className="d-flex justify-content-center">
          <Col lg={6}>
            <CarouselBootstrap indicators={false} fade>
              <CarouselItem>
                <img src={Img1} className="d-block w-100" alt="img-2" />
              </CarouselItem>
              <CarouselItem>
                <img src={Img2} className="d-block w-100" alt="img-3" />
              </CarouselItem>
              <CarouselItem>
                <img src={Img3} className="d-block w-100" alt="img-4" />
              </CarouselItem>
            </CarouselBootstrap>
          </Col>
        </div>
      </Row>
    </ComponentContainerCard>;
};
const IndividualInterval = () => {
  return <ComponentContainerCard id="individual-carousel-item-interval" title="Individual" description={<>
          Add <code>data-bs-interval=&ldquo;</code> to a <code>.carousel-item</code> to change the amount of time to delay between automatically
          cycling to the next item.
        </>}>
      <Row>
        <div className="d-flex justify-content-center">
          <Col lg={6}>
            <CarouselBootstrap indicators={false}>
              <CarouselItem interval={10000}>
                <img src={Img1} className="d-block w-100" alt="img-2" />
              </CarouselItem>
              <CarouselItem interval={2000}>
                <img src={Img2} className="d-block w-100" alt="img-3" />
              </CarouselItem>
              <CarouselItem>
                <img src={Img3} className="d-block w-100" alt="img-4" />
              </CarouselItem>
            </CarouselBootstrap>
          </Col>
        </div>
      </Row>
    </ComponentContainerCard>;
};
const DisableTouchCarousel = () => {
  return <ComponentContainerCard id="disable-touch-swiping" title="Disable touch swiping" description={<>
          Carousels support swiping left/right on touchscreen devices to move between slides. This can be disabled using the{' '}
          <code>data-bs-touch</code> attribute. The example below also does not includethe <code>data-bs-ride</code> attribute so it doesn’t autoplay.
        </>}>
      <Row>
        <div className="d-flex justify-content-center">
          <Col lg={6}>
            <CarouselBootstrap indicators={false} touch={false}>
              <CarouselItem>
                <img src={Img4} className="d-block w-100" alt="img-2" />
              </CarouselItem>
              <CarouselItem>
                <img src={Img5} className="d-block w-100" alt="img-3" />
              </CarouselItem>
              <CarouselItem>
                <img src={Img6} className="d-block w-100" alt="img-4" />
              </CarouselItem>
            </CarouselBootstrap>
          </Col>
        </div>
      </Row>
    </ComponentContainerCard>;
};
const DarkVariant = () => {
  return <ComponentContainerCard id="dark-variant" title="Dark Variant" description={<>
          Add <code>.carousel-dark</code> to the <code>.carousel</code> for darker controls, indicators, and captions. Controls have been inverted
          from their default white fill with the<code>filter</code> CSS property. Captions and controls have additional Sass variables that customize
          the<code>color</code> and <code>background-color</code>.
        </>}>
      <Row>
        <div className="d-flex justify-content-center">
          <Col lg={6}>
            <CarouselBootstrap className="carousel-dark">
              <CarouselItem interval={10000}>
                <img src={Img8} className="d-block w-100" alt="..." />
                <div className="carousel-caption d-none d-md-block">
                  <h5>First slide label</h5>
                  <p>Some representative placeholder content for the first slide.</p>
                </div>
              </CarouselItem>
              <CarouselItem interval={2000}>
                <img src={Img9} className="d-block w-100" alt="..." />
                <div className="carousel-caption d-none d-md-block">
                  <h5>Second slide label</h5>
                  <p>Some representative placeholder content for the second slide.</p>
                </div>
              </CarouselItem>
              <CarouselItem>
                <img src={Img10} className="d-block w-100" alt="..." />
                <div className="carousel-caption d-none d-md-block">
                  <h5>Third slide label</h5>
                  <p>Some representative placeholder content for the third slide.</p>
                </div>
              </CarouselItem>
            </CarouselBootstrap>
          </Col>
        </div>
      </Row>
    </ComponentContainerCard>;
};
const Carousel = () => {
  return <>
      <PageMetaData title="Carousel" />

      <Row>
        <Col xl={9}>
          <SlidesOnly />
          <SlidesWithControls />
          <SlidesWithIndicators />
          <SlidesWithCaptions />
          <CrossFade />
          <IndividualInterval />
          <DisableTouchCarousel />
          <DarkVariant />
        </Col>
        <Col xl={3}>
          <UIExamplesList examples={[{
          label: 'Slide Only',
          link: '#slides-only'
        }, {
          label: 'With Controls',
          link: '#with-controls'
        }, {
          label: 'With Indicators',
          link: '#with-indicators'
        }, {
          label: 'With Captions',
          link: '#with-captions'
        }, {
          label: 'Crossfade',
          link: '#crossfade'
        }, {
          label: 'Individual .carousel-item interval',
          link: '#individual-carousel-item-interval'
        }, {
          label: 'Disable touch swiping',
          link: '#disable-touch-swiping'
        }, {
          label: 'Dark Variant',
          link: '#dark-variant'
        }]} />
        </Col>
      </Row>
    </>;
};
export default Carousel;