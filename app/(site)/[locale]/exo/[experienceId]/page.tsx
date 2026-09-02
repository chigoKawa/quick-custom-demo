import {
  fetchExperience,
  ServerExperienceRenderer,
} from '@contentful/experiences-react';

import { experienceConfig } from '@/features/contentful/exo/lib/experience-config';


export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params;

  console.log('experienceId', experienceId);




  const previewMode = true

  // NEXT_PUBLIC_CTF_PREVIEW_TOKEN 

  const experience = await fetchExperience(
    {
      spaceId: process.env.NEXT_PUBLIC_CTF_SPACE_ID!,
      environmentId: process.env.NEXT_PUBLIC_CTF_ENVIRONMENT!,
      experienceId,
    },
    {
      accessToken: process.env.NEXT_PUBLIC_CTF_DELIVERY_TOKEN!,
      previewToken: process.env.NEXT_PUBLIC_CTF_PREVIEW_TOKEN!,
      preview: previewMode,
    },
    {
      config: experienceConfig,
    },
  );

 

  return (
    <ServerExperienceRenderer
      experience={experience}
      config={experienceConfig}

    />
  );
}
