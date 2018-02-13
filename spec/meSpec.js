describe('watsonworkspace-sdk', function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000

    require('dotenv').config()

    const spaceId = process.env.SPEC_SPACE_ID
    const SDK = require('../index')
    SDK.level('info')

    // an app appearing to be a user possibly
    const me = new SDK('', '', process.env.JWT_TOKEN)

    it('getMe', function (done) {
        me.getMe(['id', 'displayName', 'email'])
        .then(person => expect(person.email).toBe('van_staub@us.ibm.com'))
        .catch(error => expect(error).toBeUndefined())
        .finally(() => done())
    })

    it('addMember', function (done) {
        // adds the News app
        me.addMember(spaceId, ['3c845f47-c56a-4ca9-a1cb-12dbebd72c3b'])
        .then(space => {
            expect(space).not.toBe(null)
        })
        .catch(error => expect(error).toBeUndefined())
        .finally(() => done())
    })

    // EXPERIMENTAL
    it('sendSynchronousMessage', function (done) {
        me.sendSynchronousMessage(spaceId, 'Hello. I should look like a user now.')
        .then(message => {
            expect(message).not.toBe(null)
        })
        .catch(error => expect(error).toBeUndefined())
        .finally(() => done())
    })
})