import bitbucketImg from '@/assets/images/brands/bitbucket.svg';
import dribbleImg from '@/assets/images/brands/dribbble.svg';
import dropboxImg from '@/assets/images/brands/dropbox.svg';
import githubImg from '@/assets/images/brands/github.svg';
import slackImg from '@/assets/images/brands/slack.svg';
export const appsData = [{
  image: githubImg,
  name: 'Github',
  handle: '@Rasket'
}, {
  image: bitbucketImg,
  name: 'Bitbucket',
  handle: '@Rasket'
}, {
  image: dribbleImg,
  name: 'Dribble',
  handle: '@username'
}, {
  image: dropboxImg,
  name: 'Dropbox',
  handle: '@username'
}, {
  image: slackImg,
  name: 'Slack',
  handle: '@Rasket'
}];
// from: 'user' = logged-in client_id (resolved in Notifications.jsx), 'company' = Abdullah Store
export const notificationsData = [
  { from: 'company', content: 'Welcome to Abdullah Store. Your dashboard is ready.' },
  { from: 'user', content: 'Your latest scan report is available.' },
];