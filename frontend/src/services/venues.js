import { apiFetch } from './api';

// Backend ukládá ulici i číslo popisné dohromady, pro formulář je rozdělíme.
function splitStreet(street = '') {
  const match = street.match(/^(.*\S)\s+(\S*\d\S*)$/);
  return match ? [match[1], match[2]] : [street, ''];
}

function mapVenue(venue) {
  const [street, streetNumber] = splitStreet(venue.street);
  return {
    id: venue.id,
    operatorId: venue.operatorId,
    name: venue.name,
    street,
    streetNumber,
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
    priceList: sportsGround.priceList ?? null,
    openingHours: sportsGround.openingHours ?? [],
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

export async function getSportsGround(id) {
  const data = await apiFetch(`/venue/sportsGround/get?id=${encodeURIComponent(id)}`);
  return mapSportsGround(data.sportsGround);
}

export async function createSportsGround(data) {
  const dtoOut = await apiFetch('/venue/sportsGround/create', {
    method: 'POST',
    body: JSON.stringify({
      venueId: data.venueId,
      sportCode: data.sportCode,
      name: data.name,
      surface: data.surface,
      coverType: data.coverType
    })
  });

  return mapSportsGround(dtoOut.sportsGround);
}

export async function updateSportsGround(id, data) {
  const dtoOut = await apiFetch('/venue/sportsGround/update', {
    method: 'PUT',
    body: JSON.stringify({
      id,
      sportCode: data.sportCode,
      name: data.name,
      surface: data.surface,
      coverType: data.coverType
    })
  });

  return mapSportsGround(dtoOut.sportsGround);
}

export async function setOpeningHoursAndPriceList(data) {
  const dtoOut = await apiFetch('/venue/sportsGround/setOpeningHoursAndPriceList', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return mapSportsGround(dtoOut.sportsGround);
}

export async function updateVenue(id, data) {
  const dtoOut = await apiFetch('/venue/venue/update', {
    method: 'PUT',
    body: JSON.stringify({
      id,
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

export async function deleteVenue(id) {
  await apiFetch(`/venue/venue/delete?id=${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}
