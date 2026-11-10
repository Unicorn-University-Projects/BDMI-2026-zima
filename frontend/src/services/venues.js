import { apiFetch } from './api';

function mapVenue(venue) {
  return {
    id: venue.id,
    operatorId: venue.operatorId,
    name: venue.name,
    street: venue.street,
    streetNumber: '',
    city: venue.city,
    phoneNumber: venue.phone,
    emailAddress: venue.email,
    operatorNote: venue.noteForAthletes ?? '',
    sportsFieldsCount: venue.sportsFieldsCount ?? 0,
    createdAt: venue.createdAt,
    updatedAt: venue.updatedAt
  };
}

export async function listVenues() {
  const data = await apiFetch('/venue/venue/list');
  return (data.itemList ?? []).map(mapVenue);
}

export async function getVenue(id) {
  const venues = await listVenues();
  return venues.find((venue) => venue.id === id) ?? null;
}

export async function createVenue(data) {
  const dtoOut = await apiFetch('/venue/venue/create', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      street: data.street,
      streetNumber: data.streetNumber,
      city: data.city,
      phoneNumber: data.phoneNumber,
      emailAddress: data.emailAddress,
      operatorNote: data.operatorNote || undefined
    })
  });

  return mapVenue(dtoOut.venue);
}
