import React from 'react';
import {Composition} from 'remotion';
import {CapitalShort} from './CapitalShort';
// Quiz-Short „Guess the Capital“ in Remotion (Niklas 12.10.): 15 s, 1080x1920, 30 fps. Props kommen per --props (Land, Hauptstadt, Falle, Umriss).
export const Root: React.FC = () => (
  <Composition id="CapitalShort" component={CapitalShort as any} durationInFrames={450} fps={30} width={1080} height={1920}
    defaultProps={{code: 'AU', country: 'Australia', cap: 'Canberra', trap: 'Sydney', d: 'M0 0', capx: 0, capy: 0}} />
);
