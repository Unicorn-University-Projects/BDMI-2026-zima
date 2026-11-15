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

function mapSportsGround(sportsGround) {
  return {
    id: sportsGround.id,
    venueId: sportsGround.venueId,
    sportId: sportsGround.sportId,
    sportCode: sportsGround.sportCode,
    sportName: sportsGround.sportName,
    name: sportsGround.name,
    surface: sportsGround.surface ?? '',
    coverType: sportsGround.coverType,
    status: sportsGround.status,
    regularPrice: sportsGround.regularPrice == null ? null : Number(sportsGround.regularPrice),
    peakPrice: sportsGround.peakPrice == null ? null : Number(sportsGround.peakPrice),
    createdAt: sportsGround.createdAt,
    updatedAt: sportsGround.updatedAt
  };
}

export async function listVenues() {
  const data = await apiFetch('/venue/venue/list');
  return (data.itemList ?? []).map(mapVenue);
}

export async function getVenue(id) {
  const data = await apiFetch(`/venue/venue/get?id=${encodeURIComponent(id)}`);
  return mapVenue(data.venue);
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

export async function listSportsGrounds(venueId) {
  const query = venueId ? `?venueId=${encodeURIComponent(venueId)}` : '';
  const data = await apiFetch(`/venue/sportsGround/list${query}`);
  return (data.itemList ?? []).map(mapSportsGround);
}

export async function createSportsGround(data) {
  const dtoOut = await apiFetch('/venue/sportsGround/create', {
    method: 'POST',
    body: JSON.stringify({
      venueId: data.venueId,
      sportCode: data.sportCode,
      name: data.name,
      surface: data.surface || undefined,
      coverType: data.coverType,
      status: data.status || 'active',
      regularPrice:
        data.regularPrice === '' || data.regularPrice == null
          ? undefined
          : Number(data.regularPrice)
    })
  });

  return mapSportsGround(dtoOut.sportsGround);
}
