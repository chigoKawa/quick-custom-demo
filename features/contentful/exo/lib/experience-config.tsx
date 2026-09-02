
import {
    type Components,
    type Config,
  } from '@contentful/experiences-react';
  
  import { Hero } from '../components/Hero';


  const components: Components = {
    hero: Hero,
  };
  
  export const experienceConfig: Config = {
    components,
  };
