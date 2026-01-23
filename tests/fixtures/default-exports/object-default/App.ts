import config from './Config';

export const fetchData = async () => {
  const response = await fetch(config.apiUrl, {
    timeout: config.timeout,
  });
  return response.json();
};
