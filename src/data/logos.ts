// Partner and technology logos (CC0 icon sets, see src/assets/logos/NOTICE.md). Trademarks of
// their owners; replace with the official partner badges for production.
import anthropic from '../assets/logos/anthropic.svg';
import atlassian from '../assets/logos/atlassian.svg';
import aws from '../assets/logos/aws.svg';
import cursor from '../assets/logos/cursor.svg';
import databricks from '../assets/logos/databricks.svg';
import dynatrace from '../assets/logos/dynatrace.svg';
import elevenlabs from '../assets/logos/elevenlabs.svg';
import googleCloud from '../assets/logos/google-cloud.svg';
import microsoft from '../assets/logos/microsoft.svg';
import nvidia from '../assets/logos/nvidia.svg';
import snowflake from '../assets/logos/snowflake.svg';
import spotify from '../assets/logos/spotify.svg';

const LOGOS: Record<string, string> = {
  anthropic,
  atlassian,
  aws,
  cursor,
  databricks,
  dynatrace,
  elevenlabs,
  'google-cloud': googleCloud,
  microsoft,
  nvidia,
  snowflake,
  spotify,
};

const slug = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Logo for a partner or technology name ("Google Cloud", "NVIDIA"), when the set has one. */
export const logoFor = (name: string | undefined) => (name ? LOGOS[slug(name)] : undefined);
