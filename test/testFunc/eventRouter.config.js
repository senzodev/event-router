const eventRouter = [
    {
        name: 'testEvent',
        routeEnvVar: 'EVENT_ROUTE',
        subject: 'route',
        type: 'event.create.route',
        evaluation: function (item) {
            return typeof item.id !== 'undefined'
        },
        eventMap: function (event) {
            return event
        }
    }
]

export default eventRouter
