import React from 'react';
import ListingDetailModal from './ListingDetailModal';
import {
  parseAndTranslateDynamicText,
  parseAndTranslateListing,
  extractLanguageTag,
  cleanLanguageTag,
} from '../utils/dynamicTranslation';

/**
 * ListingDetails component - renders the detailed view of a listing with
 * automatic dynamic language parsing and translation.
 */
export default function ListingDetails(props) {
  return <ListingDetailModal {...props} />;
}

export {
  ListingDetailModal,
  parseAndTranslateDynamicText,
  parseAndTranslateListing,
  extractLanguageTag,
  cleanLanguageTag,
};
