I will improve this point for performance in production:

- Use a database instead of reading CSV files on every request.
- I will use lazy loading for the thumbnails that can slow down the UI if we want to use an infinite scroll and not pagination
- I will use a CDN for image storage


Docker and container could be useful also to simplify deployment and make scaling and testing simpler.